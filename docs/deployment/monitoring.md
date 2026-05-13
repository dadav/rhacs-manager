# Monitoring & Metrics

The backend exposes Prometheus metrics on the same port as the API. Metrics are unauthenticated — restrict access via NetworkPolicy if required.

## Endpoint

- Path: `/metrics`
- Port: same as the API (`backend.service.targetPort`, default `8000`)
- Excluded from scrape coverage: `/health`, `/ready`, `/metrics`

Enable or disable the endpoint via the backend `METRICS_ENABLED` environment variable (default `true`).

## Metrics

### HTTP requests

Auto-collected by [`prometheus-fastapi-instrumentator`](https://pypi.org/project/prometheus-fastapi-instrumentator/). Provides per-handler request count, in-progress gauges, and latency histograms.

### Scheduler jobs

Each APScheduler job is instrumented via `@instrument_job(...)` and emits:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `rhacs_manager_scheduler_job_duration_seconds` | Histogram | `job` | Wall-clock duration of a job invocation |
| `rhacs_manager_scheduler_job_runs_total` | Counter | `job`, `status` | Total invocations, `status` is `success` or `failure` |
| `rhacs_manager_scheduler_job_last_success_timestamp_seconds` | Gauge | `job` | Unix timestamp of the last successful run |

Current `job` labels:

- `expiry_check`
- `expiry_warning`
- `escalation_check`
- `remediation_overdue_check`
- `remediation_auto_resolve`
- `weekly_digest`

Series for each job are pre-registered at startup so they appear in `/metrics` before the first invocation.

## Helm Configuration

The Helm chart deploys a Prometheus Operator `ServiceMonitor` and exposes a named metrics port on the backend Service. Both are gated by `backend.monitoring.enabled` (default `true`).

```yaml
backend:
  monitoring:
    enabled: true
    portName: metrics
    serviceMonitor:
      additionalLabels: {}
      interval: 30s
      scrapeTimeout: 10s
      path: /metrics
      namespaceSelector: {}
```

| Key | Default | Description |
|-----|---------|-------------|
| `backend.monitoring.enabled` | `true` | Create the `ServiceMonitor` and expose the named metrics port |
| `backend.monitoring.portName` | `metrics` | Service port name the `ServiceMonitor` scrapes |
| `backend.monitoring.serviceMonitor.additionalLabels` | `{}` | Extra labels (e.g. for non-default Prometheus Operator `releaseSelectors`; not required on OpenShift User Workload Monitoring) |
| `backend.monitoring.serviceMonitor.interval` | `30s` | Scrape interval |
| `backend.monitoring.serviceMonitor.scrapeTimeout` | `10s` | Scrape timeout |
| `backend.monitoring.serviceMonitor.path` | `/metrics` | Metrics path on the backend |
| `backend.monitoring.serviceMonitor.namespaceSelector` | `{}` | Optional `namespaceSelector`; empty means the `ServiceMonitor`'s own namespace |

Set `backend.monitoring.enabled: false` when no Prometheus Operator is available.

## OpenShift User Workload Monitoring

The default `additionalLabels: {}` works with OpenShift User Workload Monitoring (UWM). Ensure UWM is enabled in the cluster:

```bash
oc -n openshift-monitoring get configmap cluster-monitoring-config -o yaml
```

The `enableUserWorkload: true` flag must be set. The `ServiceMonitor` is then picked up automatically from the `rhacs-manager` namespace.
