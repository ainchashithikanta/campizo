{{/*
Expand the name of the chart.
*/}}
{{- define "collegehub.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a fully qualified app name.
*/}}
{{- define "collegehub.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "collegehub.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Selector labels shared by all College Hub workloads.
*/}}
{{- define "collegehub.selectorLabels" -}}
app.kubernetes.io/name: {{ include "collegehub.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "collegehub.labels" -}}
helm.sh/chart: {{ include "collegehub.chart" . }}
{{ include "collegehub.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.global.labels }}
{{ toYaml . }}
{{- end }}
{{- end }}

{{/*
Component-level selector labels (app component).
Usage: {{ include "collegehub.componentSelectorLabels" (dict "context" . "component" "api") }}
*/}}
{{- define "collegehub.componentSelectorLabels" -}}
{{- $ctx := .context }}
{{ include "collegehub.selectorLabels" $ctx }}
app.kubernetes.io/component: {{ .component | quote }}
{{- end }}

{{/*
Component-level common labels.
Usage: {{ include "collegehub.componentLabels" (dict "context" . "component" "api") }}
*/}}
{{- define "collegehub.componentLabels" -}}
{{- $ctx := .context }}
{{ include "collegehub.labels" $ctx }}
app.kubernetes.io/component: {{ .component | quote }}
{{- end }}

{{/*
Image reference builder for an application component.
Usage: {{ include "collegehub.image" (dict "context" . "image" .Values.api.image) }}
*/}}
{{- define "collegehub.image" -}}
{{- $registry := .image.registry | default .context.Values.image.registry }}
{{- $organization := .image.organization | default .context.Values.image.organization }}
{{- $repository := .image.repository }}
{{- $tag := .image.tag | default .context.Values.image.tag | default .context.Chart.AppVersion }}
{{- if $registry }}
{{- printf "%s/%s:%s" $registry $repository $tag }}
{{- else }}
{{- printf "%s:%s" $repository $tag }}
{{- end }}
{{- end }}

{{/*
PostgreSQL host. Uses the bundled StatefulSet when enabled, otherwise an externally managed endpoint.
*/}}
{{- define "collegehub.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgres" (include "collegehub.fullname" .) }}
{{- else }}
{{- .Values.external.databaseHost | default "collegehub-postgres" }}
{{- end }}
{{- end }}

{{/*
Redis host. Uses the bundled StatefulSet when enabled, otherwise an externally managed endpoint.
*/}}
{{- define "collegehub.redis.host" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis" (include "collegehub.fullname" .) }}
{{- else }}
{{- .Values.external.redisHost | default "collegehub-redis" }}
{{- end }}
{{- end }}

{{/*
MinIO endpoint. Uses the bundled deployment when enabled, otherwise an externally managed endpoint.
*/}}
{{- define "collegehub.minio.endpoint" -}}
{{- if .Values.minio.enabled }}
{{- printf "http://%s-minio:9000" (include "collegehub.fullname" .) }}
{{- else }}
{{- .Values.external.storageEndpoint | default "" }}
{{- end }}
{{- end }}

{{/*
Build a PostgreSQL connection URL from its parts.
*/}}
{{- define "collegehub.postgresql.url" -}}
{{- $host := include "collegehub.postgresql.host" . }}
{{- printf "postgresql://%s:%s@%s:%d/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password $host (int .Values.postgresql.port) .Values.postgresql.auth.database }}
{{- end }}

{{/*
Build a Redis connection URL from its parts.
*/}}
{{- define "collegehub.redis.url" -}}
{{- $host := include "collegehub.redis.host" . }}
{{- if .Values.redis.auth.enabled }}
{{- printf "redis://:%s@%s:%d" .Values.redis.auth.password $host (int .Values.redis.port) }}
{{- else }}
{{- printf "redis://%s:%d" $host (int .Values.redis.port) }}
{{- end }}
{{- end }}

{{/*
Working image tag for the migration job (reuses the API image by default).
*/}}
{{- define "collegehub.migrations.image" -}}
{{- include "collegehub.image" (dict "context" . "image" (dict "registry" .Values.api.image.registry "organization" .Values.api.image.organization "repository" .Values.api.image.repository "tag" (.Values.migrations.imageTag | default .Values.api.image.tag))) }}
{{- end }}

{{/*
Backup runner image reference.
*/}}
{{- define "collegehub.backup.image" -}}
{{- include "collegehub.image" (dict "context" . "image" (dict "registry" .Values.backup.image.registry "organization" .Values.backup.image.organization "repository" .Values.backup.image.repository "tag" .Values.backup.image.tag)) }}
{{- end }}

{{/*
Backup object store endpoint. Bundled MinIO when enabled, otherwise the
explicit backup.s3.endpoint (may also fall back to external.storageEndpoint).
*/}}
{{- define "collegehub.backup.s3Endpoint" -}}
{{- if .Values.backup.s3.endpoint }}
{{- .Values.backup.s3.endpoint }}
{{- else if .Values.minio.enabled }}
{{- include "collegehub.minio.endpoint" . }}
{{- else }}
{{- .Values.external.storageEndpoint | default "http://collegehub-minio:9000" }}
{{- end }}
{{- end }}

{{/*
PostgreSQL connection URL used by the backup CLI. Prefers an explicit
secrets.databaseUrl (production managed databases), otherwise builds from the
bundled/external host + credential parts.
*/}}
{{- define "collegehub.backup.postgresUrl" -}}
{{- if .Values.secrets.databaseUrl }}
{{- .Values.secrets.databaseUrl }}
{{- else }}
{{- $host := include "collegehub.postgresql.host" . }}
{{- $password := .Values.secrets.POSTGRES_PASSWORD | default .Values.postgresql.auth.password }}
{{- printf "postgresql://%s:%s@%s:%d/%s?sslmode=disable" .Values.postgresql.auth.username $password $host (int .Values.postgresql.port) .Values.postgresql.auth.database }}
{{- end }}
{{- end }}

{{/*
Redis connection URL used by the backup CLI. Prefers an explicit secrets.redisUrl.
*/}}
{{- define "collegehub.backup.redisUrl" -}}
{{- if .Values.secrets.redisUrl }}
{{- .Values.secrets.redisUrl }}
{{- else }}
{{- include "collegehub.redis.url" . }}
{{- end }}
{{- end }}

{{/*
Backup object store access key. A dedicated backup credential wins over the
media S3 key; both resolve to the cluster Secret so secrets stay in Secret.
*/}}
{{- define "collegehub.backup.accessKey" -}}
{{- if .Values.secrets.BACKUP_S3_ACCESS_KEY_ID }}
{{- .Values.secrets.BACKUP_S3_ACCESS_KEY_ID }}
{{- else }}
{{- .Values.secrets.S3_ACCESS_KEY_ID }}
{{- end }}
{{- end }}

{{/*
Shared environment block for every backup workload (CronJobs, restore Job,
WAL archiver sidecar). Emits a YAML env list; nindent at the call site.
*/}}
{{- define "collegehub.backup.envVars" -}}
- name: BACKUP_PROVIDER
  value: {{ .Values.backup.provider | default "s3" | quote }}
- name: BACKUP_S3_ENDPOINT
  value: {{ include "collegehub.backup.s3Endpoint" . | quote }}
- name: BACKUP_S3_REGION
  value: {{ .Values.backup.s3.region | default "us-east-1" | quote }}
- name: BACKUP_S3_BUCKET
  value: {{ .Values.backup.s3.bucket | quote }}
- name: BACKUP_S3_ACCESS_KEY_ID
  valueFrom:
    secretKeyRef:
      name: {{ include "collegehub.fullname" . }}-secret
      key: {{ if .Values.secrets.BACKUP_S3_ACCESS_KEY_ID }}BACKUP_S3_ACCESS_KEY_ID{{ else }}S3_ACCESS_KEY_ID{{ end }}
- name: BACKUP_S3_SECRET_ACCESS_KEY
  valueFrom:
    secretKeyRef:
      name: {{ include "collegehub.fullname" . }}-secret
      key: {{ if .Values.secrets.BACKUP_S3_SECRET_ACCESS_KEY }}BACKUP_S3_SECRET_ACCESS_KEY{{ else }}S3_SECRET_ACCESS_KEY{{ end }}
- name: BACKUP_POSTGRES_URL
  value: {{ include "collegehub.backup.postgresUrl" . | quote }}
- name: BACKUP_REDIS_URL
  value: {{ include "collegehub.backup.redisUrl" . | quote }}
- name: BACKUP_PREFIX
  value: {{ .Values.backup.prefix | quote }}
- name: BACKUP_VERIFY_AFTER_CREATE
  value: {{ .Values.backup.verifyAfterCreate | quote }}
- name: BACKUP_RETENTION_FULL_BACKUPS
  value: {{ .Values.backup.retention.fullBackups | quote }}
- name: BACKUP_RETENTION_WAL_HOURS
  value: {{ .Values.backup.retention.walHours | quote }}
- name: BACKUP_RETENTION_REDIS_SNAPSHOTS
  value: {{ .Values.backup.retention.redisSnapshots | quote }}
- name: BACKUP_RETENTION_MINIO_MIRRORS
  value: {{ .Values.backup.retention.minioMirrors | quote }}
{{- end }}
