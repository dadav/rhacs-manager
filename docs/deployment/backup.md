# Database Backups

RHACS Manager uses [CloudNativePG](https://cloudnative-pg.io/) (CNPG) for the application database. CNPG supports continuous backup and WAL archiving to object stores via [Barman Cloud](https://pgbarman.org/).

Backups are **hub-only** — spoke clusters do not run a database.

## How It Works

When backup is enabled, the Helm chart configures two things:

1. **Continuous WAL archiving** — every WAL segment is compressed and shipped to the object store as it is produced, enabling point-in-time recovery.
2. **Scheduled base backups** — a `ScheduledBackup` resource triggers periodic full backups using `barman-cloud-backup`.

CNPG automatically manages backup retention, deleting obsolete base backups and WAL files older than the configured retention window.

## Enabling Backups

Set `database.cnpg.backup.enabled: true` and configure your object store provider. Backups are disabled by default.

### Minimal Example (S3)

```yaml
database:
  cnpg:
    backup:
      enabled: true
      provider: s3
      destinationPath: "s3://my-bucket/rhacs-manager-backups"
      s3:
        secretName: backup-s3-creds
```

Create the credentials secret beforehand:

```bash
oc -n rhacs-manager create secret generic backup-s3-creds \
  --from-literal=ACCESS_KEY_ID='<your-access-key>' \
  --from-literal=ACCESS_SECRET_KEY='<your-secret-key>'
```

## Provider Configuration

Set `database.cnpg.backup.provider` to one of `s3`, `azure`, or `gcs`.

=== "AWS S3"

    ```yaml
    database:
      cnpg:
        backup:
          enabled: true
          provider: s3
          destinationPath: "s3://bucket-name/path"
          s3:
            secretName: backup-s3-creds
            accessKeyIdKey: ACCESS_KEY_ID         # key within the secret
            secretAccessKeyKey: ACCESS_SECRET_KEY  # key within the secret
    ```

    For **EKS with IRSA** (IAM Roles for Service Accounts), omit `secretName` so CNPG uses the pod's IAM role:

    ```yaml
    database:
      cnpg:
        backup:
          enabled: true
          provider: s3
          destinationPath: "s3://bucket-name/path"
    ```

=== "S3-Compatible (MinIO)"

    ```yaml
    database:
      cnpg:
        backup:
          enabled: true
          provider: s3
          destinationPath: "s3://bucket-name/path"
          s3:
            secretName: minio-creds
            endpointURL: "https://minio.example.com:9000"
            # Optional: custom CA for self-signed certificates
            endpointCA:
              name: minio-ca-secret
              key: ca.crt
    ```

=== "Azure Blob Storage"

    ```yaml
    database:
      cnpg:
        backup:
          enabled: true
          provider: azure
          destinationPath: "https://account.blob.core.windows.net/container/path"
          azure:
            secretName: backup-azure-creds
            storageAccountKey: AZURE_STORAGE_ACCOUNT
            storageKeyKey: AZURE_STORAGE_KEY
    ```

    For **Azure AD Workload Identity**, use `inheritFromAzureAD` instead of a secret:

    ```yaml
    azure:
      inheritFromAzureAD: true
    ```

=== "Google Cloud Storage"

    ```yaml
    database:
      cnpg:
        backup:
          enabled: true
          provider: gcs
          destinationPath: "gs://bucket-name/path"
          gcs:
            secretName: backup-gcs-creds
            applicationCredentialsKey: gcsCredentials
    ```

    Create the secret from a service account JSON key:

    ```bash
    oc -n rhacs-manager create secret generic backup-gcs-creds \
      --from-file=gcsCredentials=service-account.json
    ```

    For **GKE Workload Identity**, use `gkeEnvironment` instead of a secret:

    ```yaml
    gcs:
      gkeEnvironment: true
    ```

## Retention Policy

The `retentionPolicy` field controls how long backups are kept using recovery-window semantics. The default is `30d` (30 days).

```yaml
database:
  cnpg:
    backup:
      retentionPolicy: "30d"
```

CNPG automatically marks base backups older than this window as obsolete and removes them along with WAL files that are no longer needed.

## Backup Schedule

The `scheduledBackup` section controls when base backups run. The schedule uses a **6-field cron format** (with seconds):

```
┌──────────── second (0-59)
│ ┌────────── minute (0-59)
│ │ ┌──────── hour (0-23)
│ │ │ ┌────── day of month (1-31)
│ │ │ │ ┌──── month (1-12)
│ │ │ │ │ ┌── day of week (0-6, Sun=0)
│ │ │ │ │ │
0 0 0 * * *    ← daily at midnight (default)
```

```yaml
database:
  cnpg:
    backup:
      scheduledBackup:
        enabled: true                # enabled by default when backup is on
        schedule: "0 0 0 * * *"      # daily at midnight
        immediate: true              # take a backup right away on creation
        backupOwnerReference: self   # self, cluster, or none
```

Setting `immediate: true` (the default) triggers a backup as soon as the `ScheduledBackup` resource is created, rather than waiting for the next cron window.

## Compression

Both WAL archiving and base backups support compression. Supported algorithms: `gzip`, `bzip2`, `lz4`, `snappy`, `xz`, `zstd`.

```yaml
database:
  cnpg:
    backup:
      wal:
        compression: gzip        # default
        additionalCommandArgs: []
      data:
        compression: gzip        # default
        additionalCommandArgs: []
```

## All Backup Values

| Value | Default | Description |
| ----- | ------- | ----------- |
| `database.cnpg.backup.enabled` | `false` | Enable Barman Object Store backups |
| `database.cnpg.backup.provider` | `s3` | Object store provider: `s3`, `azure`, or `gcs` |
| `database.cnpg.backup.destinationPath` | `""` | Bucket/container URL |
| `database.cnpg.backup.retentionPolicy` | `"30d"` | Recovery window retention |
| `database.cnpg.backup.s3.secretName` | `""` | Secret with S3 credentials |
| `database.cnpg.backup.s3.accessKeyIdKey` | `ACCESS_KEY_ID` | Key in secret for access key |
| `database.cnpg.backup.s3.secretAccessKeyKey` | `ACCESS_SECRET_KEY` | Key in secret for secret key |
| `database.cnpg.backup.s3.endpointURL` | `""` | Custom S3 endpoint (MinIO, etc.) |
| `database.cnpg.backup.s3.endpointCA.name` | `""` | Secret name for custom CA |
| `database.cnpg.backup.s3.endpointCA.key` | `ca.crt` | Key in CA secret |
| `database.cnpg.backup.azure.secretName` | `""` | Secret with Azure credentials |
| `database.cnpg.backup.azure.storageAccountKey` | `AZURE_STORAGE_ACCOUNT` | Key in secret for account name |
| `database.cnpg.backup.azure.storageKeyKey` | `AZURE_STORAGE_KEY` | Key in secret for storage key |
| `database.cnpg.backup.azure.inheritFromAzureAD` | `false` | Use Azure AD Workload Identity |
| `database.cnpg.backup.gcs.secretName` | `""` | Secret with GCS credentials |
| `database.cnpg.backup.gcs.applicationCredentialsKey` | `gcsCredentials` | Key in secret for JSON key |
| `database.cnpg.backup.gcs.gkeEnvironment` | `false` | Use GKE Workload Identity |
| `database.cnpg.backup.wal.compression` | `gzip` | WAL compression algorithm |
| `database.cnpg.backup.wal.additionalCommandArgs` | `[]` | Extra barman-cloud-wal-archive args |
| `database.cnpg.backup.data.compression` | `gzip` | Base backup compression algorithm |
| `database.cnpg.backup.data.additionalCommandArgs` | `[]` | Extra barman-cloud-backup args |
| `database.cnpg.backup.scheduledBackup.enabled` | `true` | Create a ScheduledBackup resource |
| `database.cnpg.backup.scheduledBackup.schedule` | `"0 0 0 * * *"` | 6-field cron schedule |
| `database.cnpg.backup.scheduledBackup.immediate` | `true` | Trigger backup on creation |
| `database.cnpg.backup.scheduledBackup.backupOwnerReference` | `self` | Owner reference mode |

## Verifying Backups

After enabling backups, check that WAL archiving and the first base backup succeed:

```bash
# Check the CNPG cluster status
oc -n rhacs-manager get cluster rhacs-manager-db

# Check the scheduled backup status
oc -n rhacs-manager get scheduledbackup

# List completed backups
oc -n rhacs-manager get backup

# Inspect the cluster for backup details
oc -n rhacs-manager describe cluster rhacs-manager-db | grep -A20 "Status:"
```

!!! tip "First backup"
    With `immediate: true` (the default), the first base backup starts as soon as the `ScheduledBackup` resource is created. Check `oc get backup` to confirm it completed successfully.

!!! warning "Credentials"
    The backup credentials secret must exist in the `rhacs-manager` namespace **before** the Helm release is installed. CNPG will fail to start WAL archiving if it cannot access the object store.
