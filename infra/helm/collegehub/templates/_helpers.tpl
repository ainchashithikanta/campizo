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
