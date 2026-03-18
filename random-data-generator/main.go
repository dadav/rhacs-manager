package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"math"
	"math/rand"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// Component pool — realistic package names found in container images.
var componentPool = []string{
	"openssl", "curl", "glibc", "systemd", "zlib", "expat", "libxml2", "libpng",
	"libjpeg-turbo", "sqlite", "pcre2", "bash", "coreutils", "gnutls", "nss",
	"krb5", "cyrus-sasl", "libssh2", "nghttp2", "brotli", "icu", "tzdata",
	"ca-certificates", "openldap", "readline", "ncurses", "libffi", "python3",
	"nodejs", "vim-minimal", "shadow-utils", "pam", "audit-libs", "libselinux",
	"libcap", "dbus", "util-linux", "xz-libs", "bzip2-libs", "libarchive",
	"libgcrypt", "gpgme", "dnf", "rpm",
}

// Severity levels with weights (more moderate/low, fewer critical).
// Values match backend SeverityLevel(int, enum.Enum): 0=UNKNOWN, 1=LOW, 2=MODERATE, 3=IMPORTANT, 4=CRITICAL
var severityWeights = []struct {
	value  int
	weight int
	cvssLo float64
	cvssHi float64
}{
	{1, 25, 0.1, 3.9},  // LOW
	{2, 35, 4.0, 6.9},  // MODERATE
	{3, 30, 7.0, 8.9},  // IMPORTANT
	{4, 10, 9.0, 10.0}, // CRITICAL
}

var severityTotalWeight int

func init() {
	for _, sw := range severityWeights {
		severityTotalWeight += sw.weight
	}
}

func pickSeverity(r *rand.Rand) (int, float64, float64) {
	n := r.Intn(severityTotalWeight)
	cumulative := 0
	for _, sw := range severityWeights {
		cumulative += sw.weight
		if n < cumulative {
			cvss := sw.cvssLo + r.Float64()*(sw.cvssHi-sw.cvssLo)
			cvss = math.Round(cvss*10) / 10
			// Impact score correlates loosely with CVSS
			impact := cvss*0.6 + r.Float64()*2.0
			if impact > 10.0 {
				impact = 10.0
			}
			impact = math.Round(impact*10) / 10
			return sw.value, cvss, impact
		}
	}
	return 1, 1.0, 1.0
}

// Log-distributed EPSS: most CVEs have low EPSS, few have high.
func pickEPSS(r *rand.Rand) float64 {
	// Use exponential distribution, clamp to [0, 1]
	v := r.ExpFloat64() / 10.0
	if v > 1.0 {
		v = 1.0
	}
	return math.Round(v*10000) / 10000
}

func hashID(parts ...string) string {
	h := sha256.Sum256([]byte(strings.Join(parts, ":")))
	return fmt.Sprintf("%x", h[:16])
}

func pickVersion(r *rand.Rand) string {
	major := r.Intn(5) + 1
	minor := r.Intn(30)
	patch := r.Intn(20)
	return fmt.Sprintf("%d.%d.%d", major, minor, patch)
}

type cveRecord struct {
	cveID     string
	severity  int
	cvss      float64
	impact    float64
	epss      float64
	fixable   bool
	fixedBy   string
	published time.Time
}

func main() {
	dbURL := flag.String("db-url", "", "PostgreSQL connection URL (env: STACKROX_DB_URL)")
	clusterName := flag.String("cluster-name", "local-cluster", "Cluster name for deployment records")
	namespacesFlag := flag.String("namespaces", "", "Comma-separated namespace filter (default: all)")
	minCVEs := flag.Int("min-cves", 5, "Minimum CVEs per image")
	maxCVEs := flag.Int("max-cves", 20, "Maximum CVEs per image")
	cleanup := flag.Bool("cleanup", false, "Drop all 4 tables and exit")
	flag.Parse()

	// Resolve DB URL
	connStr := *dbURL
	if connStr == "" {
		connStr = os.Getenv("STACKROX_DB_URL")
	}
	if connStr == "" {
		connStr = "postgresql://postgres@localhost:5433/central_active?sslmode=disable"
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("Connected to database")

	if *cleanup {
		doCleanup(db)
		return
	}

	// Connect to Kubernetes
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
	config, err := kubeConfig.ClientConfig()
	if err != nil {
		log.Fatalf("Failed to load kubeconfig: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client: %v", err)
	}

	// Parse namespace filter
	var nsFilter map[string]bool
	if *namespacesFlag != "" {
		nsFilter = make(map[string]bool)
		for _, ns := range strings.Split(*namespacesFlag, ",") {
			ns = strings.TrimSpace(ns)
			if ns != "" {
				nsFilter[ns] = true
			}
		}
	}

	// List deployments from the cluster
	ctx := context.Background()
	deploymentList, err := clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	if err != nil {
		log.Fatalf("Failed to list deployments: %v", err)
	}

	type deploymentInfo struct {
		name      string
		namespace string
		images    []string // full image references
	}

	var deployments []deploymentInfo
	for _, dep := range deploymentList.Items {
		if nsFilter != nil && !nsFilter[dep.Namespace] {
			continue
		}
		var images []string
		for _, c := range dep.Spec.Template.Spec.Containers {
			if c.Image != "" {
				images = append(images, c.Image)
			}
		}
		for _, c := range dep.Spec.Template.Spec.InitContainers {
			if c.Image != "" {
				images = append(images, c.Image)
			}
		}
		if len(images) > 0 {
			deployments = append(deployments, deploymentInfo{
				name:      dep.Name,
				namespace: dep.Namespace,
				images:    images,
			})
		}
	}

	log.Printf("Found %d deployments with containers", len(deployments))
	if len(deployments) == 0 {
		log.Println("No deployments found, nothing to generate")
		return
	}

	// Collect unique images
	imageSet := make(map[string]bool)
	for _, dep := range deployments {
		for _, img := range dep.images {
			imageSet[img] = true
		}
	}
	var uniqueImages []string
	for img := range imageSet {
		uniqueImages = append(uniqueImages, img)
	}
	log.Printf("Found %d unique images", len(uniqueImages))

	// Create tables
	createTables(db)

	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	// Generate a shared CVE pool (some CVEs appear across multiple images)
	sharedCVECount := 10 + r.Intn(15)
	sharedCVEs := make([]cveRecord, sharedCVECount)
	for i := range sharedCVEs {
		sev, cvss, impact := pickSeverity(r)
		fixable := r.Float64() < 0.4
		fixedBy := ""
		if fixable {
			fixedBy = pickVersion(r)
		}
		sharedCVEs[i] = cveRecord{
			cveID:     fmt.Sprintf("CVE-%d-%05d", 2023+r.Intn(3), 10000+r.Intn(40000)),
			severity:  sev,
			cvss:      cvss,
			impact:    impact,
			epss:      pickEPSS(r),
			fixable:   fixable,
			fixedBy:   fixedBy,
			published: time.Now().AddDate(0, 0, -r.Intn(730)),
		}
	}

	// Generate components per image and CVEs
	type componentRecord struct {
		id      string
		name    string
		version string
		os      string
	}

	type imageCVE struct {
		imageID     string
		componentID string
		cve         cveRecord
		firstSeen   time.Time
		os          string
	}

	var allComponents []componentRecord
	var allImageCVEs []imageCVE
	componentSeen := make(map[string]bool)

	osList := []string{"rhel:8", "rhel:9", "ubuntu:22.04", "debian:12", "alpine:3.19"}

	for _, img := range uniqueImages {
		imageID := hashID("image", img)
		imageOS := osList[r.Intn(len(osList))]

		// Pick 3-8 components for this image
		numComponents := 3 + r.Intn(6)
		var imageComponents []componentRecord
		usedComponents := make(map[int]bool)
		for len(imageComponents) < numComponents {
			idx := r.Intn(len(componentPool))
			if usedComponents[idx] {
				continue
			}
			usedComponents[idx] = true
			comp := componentRecord{
				id:      hashID("component", img, componentPool[idx]),
				name:    componentPool[idx],
				version: pickVersion(r),
				os:      imageOS,
			}
			imageComponents = append(imageComponents, comp)
			if !componentSeen[comp.id] {
				componentSeen[comp.id] = true
				allComponents = append(allComponents, comp)
			}
		}

		// Generate CVEs for this image
		numCVEs := *minCVEs + r.Intn(*maxCVEs-*minCVEs+1)
		usedCVEIDs := make(map[string]bool)

		// Include some shared CVEs
		numShared := r.Intn(len(sharedCVEs)/2 + 1)
		if numShared > numCVEs/2 {
			numShared = numCVEs / 2
		}
		perm := r.Perm(len(sharedCVEs))
		for i := 0; i < numShared && i < len(perm); i++ {
			cve := sharedCVEs[perm[i]]
			if usedCVEIDs[cve.cveID] {
				continue
			}
			usedCVEIDs[cve.cveID] = true
			comp := imageComponents[r.Intn(len(imageComponents))]
			allImageCVEs = append(allImageCVEs, imageCVE{
				imageID:     imageID,
				componentID: comp.id,
				cve:         cve,
				firstSeen:   time.Now().AddDate(0, 0, -r.Intn(365)),
				os:          imageOS,
			})
		}

		// Fill remaining with unique CVEs
		for len(usedCVEIDs) < numCVEs {
			cveID := fmt.Sprintf("CVE-%d-%05d", 2023+r.Intn(3), 10000+r.Intn(40000))
			if usedCVEIDs[cveID] {
				continue
			}
			usedCVEIDs[cveID] = true
			sev, cvss, impact := pickSeverity(r)
			fixable := r.Float64() < 0.4
			fixedBy := ""
			if fixable {
				fixedBy = pickVersion(r)
			}
			comp := imageComponents[r.Intn(len(imageComponents))]
			allImageCVEs = append(allImageCVEs, imageCVE{
				imageID:     imageID,
				componentID: comp.id,
				cve: cveRecord{
					cveID:     cveID,
					severity:  sev,
					cvss:      cvss,
					impact:    impact,
					epss:      pickEPSS(r),
					fixable:   fixable,
					fixedBy:   fixedBy,
					published: time.Now().AddDate(0, 0, -r.Intn(730)),
				},
				firstSeen: time.Now().AddDate(0, 0, -r.Intn(365)),
				os:        imageOS,
			})
		}
	}

	log.Printf("Generated %d components, %d image-CVE records", len(allComponents), len(allImageCVEs))

	// Insert data
	tx, err := db.Begin()
	if err != nil {
		log.Fatalf("Failed to begin transaction: %v", err)
	}

	// Insert deployments
	depCount := 0
	for _, dep := range deployments {
		depID := hashID("deployment", dep.namespace, dep.name)
		_, err := tx.Exec(`
			INSERT INTO deployments (id, name, namespace, clustername)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO NOTHING`,
			depID, dep.name, dep.namespace, *clusterName)
		if err != nil {
			tx.Rollback()
			log.Fatalf("Failed to insert deployment: %v", err)
		}
		depCount++

		// Insert containers
		for _, img := range dep.images {
			containerID := hashID("container", dep.namespace, dep.name, img)
			imageID := hashID("image", img)
			_, err := tx.Exec(`
				INSERT INTO deployments_containers (id, deployments_id, image_id, image_name_fullname)
				VALUES ($1, $2, $3, $4)
				ON CONFLICT (id) DO NOTHING`,
				containerID, depID, imageID, img)
			if err != nil {
				tx.Rollback()
				log.Fatalf("Failed to insert container: %v", err)
			}
		}
	}
	log.Printf("Inserted %d deployments", depCount)

	// Insert components
	for _, comp := range allComponents {
		_, err := tx.Exec(`
			INSERT INTO image_component_v2 (id, name, version, operatingsystem)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (id) DO NOTHING`,
			comp.id, comp.name, comp.version, comp.os)
		if err != nil {
			tx.Rollback()
			log.Fatalf("Failed to insert component: %v", err)
		}
	}
	log.Printf("Inserted %d components", len(allComponents))

	// Insert image CVEs
	for _, ic := range allImageCVEs {
		_, err := tx.Exec(`
			INSERT INTO image_cves_v2 (
				imageid, componentid, cvebaseinfo_cve, severity, cvss,
				cvebaseinfo_epss_epssprobability, impactscore,
				firstimageoccurrence, cvebaseinfo_publishedon,
				isfixable, fixedby, operatingsystem
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT DO NOTHING`,
			ic.imageID, ic.componentID, ic.cve.cveID, ic.cve.severity, ic.cve.cvss,
			ic.cve.epss, ic.cve.impact,
			ic.firstSeen, ic.cve.published,
			ic.cve.fixable, ic.cve.fixedBy, ic.os)
		if err != nil {
			tx.Rollback()
			log.Fatalf("Failed to insert image CVE: %v", err)
		}
	}
	log.Printf("Inserted %d image CVE records", len(allImageCVEs))

	if err := tx.Commit(); err != nil {
		log.Fatalf("Failed to commit transaction: %v", err)
	}

	log.Println("Done! Data generation complete.")
}

func createTables(db *sql.DB) {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS deployments (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			namespace TEXT NOT NULL,
			clustername TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS deployments_containers (
			id TEXT PRIMARY KEY,
			deployments_id TEXT NOT NULL REFERENCES deployments(id),
			image_id TEXT NOT NULL,
			image_name_fullname TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS image_component_v2 (
			id TEXT PRIMARY KEY,
			name TEXT,
			version TEXT,
			operatingsystem TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS image_cves_v2 (
			imageid TEXT NOT NULL,
			componentid TEXT REFERENCES image_component_v2(id),
			cvebaseinfo_cve TEXT NOT NULL,
			severity INTEGER,
			cvss DOUBLE PRECISION,
			cvebaseinfo_epss_epssprobability DOUBLE PRECISION,
			impactscore DOUBLE PRECISION,
			firstimageoccurrence TIMESTAMP WITHOUT TIME ZONE,
			cvebaseinfo_publishedon TIMESTAMP WITHOUT TIME ZONE,
			isfixable BOOLEAN DEFAULT false,
			fixedby TEXT,
			operatingsystem TEXT
		)`,
		// Indexes for query performance
		`CREATE INDEX IF NOT EXISTS idx_dc_deployments_id ON deployments_containers(deployments_id)`,
		`CREATE INDEX IF NOT EXISTS idx_dc_image_id ON deployments_containers(image_id)`,
		`CREATE INDEX IF NOT EXISTS idx_icv2_imageid ON image_cves_v2(imageid)`,
		`CREATE INDEX IF NOT EXISTS idx_icv2_componentid ON image_cves_v2(componentid)`,
		`CREATE INDEX IF NOT EXISTS idx_icv2_cve ON image_cves_v2(cvebaseinfo_cve)`,
	}

	for _, stmt := range statements {
		if _, err := db.Exec(stmt); err != nil {
			log.Fatalf("Failed to execute DDL: %v\nStatement: %s", err, stmt)
		}
	}
	log.Println("Tables and indexes created")
}

func doCleanup(db *sql.DB) {
	tables := []string{"image_cves_v2", "image_component_v2", "deployments_containers", "deployments"}
	for _, t := range tables {
		if _, err := db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE", t)); err != nil {
			log.Fatalf("Failed to drop table %s: %v", t, err)
		}
		log.Printf("Dropped table %s", t)
	}
	log.Println("Cleanup complete")
}
