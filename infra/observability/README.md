# College Hub — Observability (MS-55)

Observability artifacts for the College Hub platform: metrics, tracing,
structured logs, health probes, alerting rules, SLOs, and dashboards.

## Layout

```
infra/observability/
  compose/                     Local dev stack (docker compose --profile observability)
    prometheus.yml             Scrapes host API (:4000) + worker (:4100) /metrics
    grafana-datasources.yml    Provisioned Prometheus datasource (uid "prometheus")
    grafana-dashboards.yml     Sidecar-free file provisioning for dashboards
    otel-collector.yml         OTLP receiver -> debug exporter (traces)
  README.md                    This file

infra/helm/collegehub/
  rules/                       Canonical PrometheusRules (9 files: 6 alert + 3 SLO)
  dashboards/                  Canonical Grafana dashboards (7 files)
  templates/observability/     Helm templates that render them into the cluster
```

Dashboards and rules are rendered into the cluster by the Helm chart
(`infra/helm/collegehub`) as `PrometheusRule`, `ServiceMonitor`, `PodMonitor`,
and dashboard `ConfigMap` resources. See the chart's `observability` values
section for the toggles.

## Dashboards (7)

| UID                    | Title                        | Panels |
|------------------------|------------------------------|--------|
| collegehub-api-http    | API (HTTP)                   | 5      |
| collegehub-database    | Database (PostgreSQL)        | 4      |
| collegehub-cache       | Cache (Redis)                | 4      |
| collegehub-jobs        | Background Jobs              | 4      |
| collegehub-business    | Business KPIs                | 4      |
| collegehub-process     | Process (Node.js)            | 4      |
| collegehub-kubernetes  | Kubernetes                   | 4      |

All dashboards target a Prometheus datasource with UID `prometheus`
(schemaVersion 39, refresh 30s).

## Alerting rules (infra/helm/collegehub/rules)

- `api-alerts.yaml`       — availability, 5xx rate, p99 latency, in-flight, payload size
- `database-alerts.yaml`  — query error rate, latency, slow-query spike, pool exhaustion
- `cache-alerts.yaml`     — cache down, Redis error rate, command latency
- `worker-alerts.yaml`    — job failure rate, duration, stuck in-flight
- `business-alerts.yaml`  — auth failure spikes, notification failures, marketplace silence
- `process-alerts.yaml`   — event-loop lag, heap usage, crash-loop detection

## SLOs (infra/helm/collegehub/rules/*-slo.yaml)

Google SRE multi-window burn-rate alerting.

| SLO                          | Objective | Budget | Pages        |
|------------------------------|-----------|--------|--------------|
| HTTP 5xx (http-api-slo)      | 99.5%     | 0.5%   | burn >= 14.4/5m, >= 6/30m |
| Background jobs (jobs-slo)   | 99%       | 1%     | burn >= 14.4/5m, >= 6/30m |
| DB query success (database-slo) | 99%    | 1%     | burn >= 14.4/5m, >= 6/30m |

## Local observability stack

```sh
docker compose --profile observability up -d
```

- Prometheus  http://localhost:9090
- Grafana     http://localhost:3001 (admin/admin) — dashboards auto-provisioned
- OTLP        http://localhost:4318/v1/traces (set `OTEL_TRACES_ENABLED=true`)

## Provisioning in a cluster

The Helm chart renders observability resources when the Prometheus Operator /
kube-prometheus-stack CRDs are installed:

```sh
helm template collegehub infra/helm/collegehub \
  -f infra/helm/collegehub/values.prod.yaml \
  --set global.namespace=collegehub-prod
```

To apply rules/dashboards without the full chart:

```sh
kubectl apply -f infra/helm/collegehub/rules
```

Note: kubeconform validation of rendered manifests uses
`-ignore-missing-schemas` because Prometheus Operator CRDs
(`ServiceMonitor`, `PodMonitor`, `PrometheusRule`) have no built-in schemas.
