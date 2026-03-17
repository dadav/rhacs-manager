# Database Restore

This guide covers restoring the RHACS Manager application database from a Barman Object Store backup. Restore is a manual process — the Helm chart does not automate it.

Restores are **hub-only** — spoke clusters do not run a database.

## Prerequisites

- A working CNPG backup in your object store (see [Database Backups](backup.md))
- `oc` or `kubectl` access to the hub cluster
- The same backup credentials secret used during backup

## How CNPG Recovery Works

CNPG restores by creating a **new Cluster** resource with `bootstrap.recovery` instead of `bootstrap.initdb`. The new cluster streams the base backup and replays WAL segments from the object store to reach the desired point in time.

!!! warning "Destructive operation"
    Recovery replaces all data in the application database. Make sure you are restoring to the correct backup and target time.

## Step 1: Scale Down the Application

Stop the backend so it does not write to the database during recovery:

```bash
oc -n rhacs-manager scale deployment rhacs-manager-backend --replicas=0
```

## Step 2: Delete the Existing Cluster

Remove the current CNPG Cluster resource. CNPG will delete the associated PVCs and pods:

```bash
oc -n rhacs-manager delete cluster rhacs-manager-db
```

!!! tip "Confirm deletion"
    Wait until all database pods are gone before proceeding:
    ```bash
    oc -n rhacs-manager get pods -l cnpg.io/cluster=rhacs-manager-db
    ```

## Step 3: Create a Recovery Cluster

Apply a Cluster manifest that uses `bootstrap.recovery` to restore from the object store. Adjust the `barmanObjectStore` section to match your provider configuration from `values.yaml`.

### Restore to Latest (Most Recent Backup + All WAL)

=== "S3"

    ```yaml
    apiVersion: postgresql.cnpg.io/v1
    kind: Cluster
    metadata:
      name: rhacs-manager-db
      namespace: rhacs-manager
    spec:
      instances: 1
      bootstrap:
        recovery:
          source: rhacs-manager-backup
      externalClusters:
        - name: rhacs-manager-backup
          barmanObjectStore:
            destinationPath: "s3://my-bucket/rhacs-manager-backups"
            s3Credentials:
              accessKeyId:
                name: backup-s3-creds
                key: ACCESS_KEY_ID
              secretAccessKey:
                name: backup-s3-creds
                key: ACCESS_SECRET_KEY
            wal:
              compression: gzip
            data:
              compression: gzip
      storage:
        size: 2Gi
    ```

=== "Azure Blob Storage"

    ```yaml
    apiVersion: postgresql.cnpg.io/v1
    kind: Cluster
    metadata:
      name: rhacs-manager-db
      namespace: rhacs-manager
    spec:
      instances: 1
      bootstrap:
        recovery:
          source: rhacs-manager-backup
      externalClusters:
        - name: rhacs-manager-backup
          barmanObjectStore:
            destinationPath: "https://account.blob.core.windows.net/container/path"
            azureCredentials:
              storageAccount:
                name: backup-azure-creds
                key: AZURE_STORAGE_ACCOUNT
              storageKey:
                name: backup-azure-creds
                key: AZURE_STORAGE_KEY
            wal:
              compression: gzip
            data:
              compression: gzip
      storage:
        size: 2Gi
    ```

=== "Google Cloud Storage"

    ```yaml
    apiVersion: postgresql.cnpg.io/v1
    kind: Cluster
    metadata:
      name: rhacs-manager-db
      namespace: rhacs-manager
    spec:
      instances: 1
      bootstrap:
        recovery:
          source: rhacs-manager-backup
      externalClusters:
        - name: rhacs-manager-backup
          barmanObjectStore:
            destinationPath: "gs://bucket-name/path"
            googleCredentials:
              applicationCredentials:
                name: backup-gcs-creds
                key: gcsCredentials
            wal:
              compression: gzip
            data:
              compression: gzip
      storage:
        size: 2Gi
    ```

```bash
oc -n rhacs-manager apply -f recovery-cluster.yaml
```

### Point-in-Time Recovery (PITR)

To restore to a specific point in time, add a `recoveryTarget` to the `recovery` section:

```yaml
bootstrap:
  recovery:
    source: rhacs-manager-backup
    recoveryTarget:
      targetTime: "2025-03-15T14:30:00Z"
```

CNPG replays WAL segments up to (but not including) the target timestamp.

## Step 4: Wait for Recovery

Monitor the new cluster until it reaches `Cluster in healthy state`:

```bash
# Watch cluster status
oc -n rhacs-manager get cluster rhacs-manager-db -w

# Check pod readiness
oc -n rhacs-manager get pods -l cnpg.io/cluster=rhacs-manager-db
```

## Step 5: Scale the Application Back Up

Once the database cluster is healthy, restart the backend:

```bash
oc -n rhacs-manager scale deployment rhacs-manager-backend --replicas=1
```

Alembic migrations run automatically on startup and will apply any schema changes if the backup predates recent migrations.

## Step 6: Re-enable Backups

The recovery cluster does not have backup configuration. Run a Helm upgrade to re-attach the backup schedule:

```bash
helm upgrade rhacs-manager deploy/helm/rhacs-manager/ \
  -n rhacs-manager \
  -f your-values.yaml
```

!!! warning "Helm ownership"
    The `helm upgrade` will reconcile the Cluster resource back to chart-managed state, including the `backup` section and `ScheduledBackup`. Make sure your `values.yaml` has `database.cnpg.backup.enabled: true`.

## Troubleshooting

| Symptom | Likely Cause | Fix |
| ------- | ------------ | --- |
| Recovery pod stuck in `Init` | Credentials secret missing or wrong keys | Verify the secret exists and key names match |
| `WAL file not found` errors | WAL archiving was not enabled before the failure | You can only recover up to the last base backup without WAL |
| `recovery target not reached` | Target time is after the last available WAL | Use a target time within the backup retention window |
| Backend fails to connect after restore | Service name changed or cluster not ready | Confirm `oc get cluster` shows healthy and the service `rhacs-manager-db-rw` exists |
