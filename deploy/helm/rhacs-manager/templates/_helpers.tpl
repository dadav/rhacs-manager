{{/* Chart name */}}
{{- define "rhacs-manager.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Full chart name */}}
{{- define "rhacs-manager.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/* Chart version label */}}
{{- define "rhacs-manager.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Common labels */}}
{{- define "rhacs-manager.labels" -}}
helm.sh/chart: {{ include "rhacs-manager.chart" . }}
{{ include "rhacs-manager.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/* Selector labels */}}
{{- define "rhacs-manager.selectorLabels" -}}
app.kubernetes.io/name: {{ include "rhacs-manager.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/* Target namespace */}}
{{- define "rhacs-manager.namespace" -}}
{{- default .Release.Namespace .Values.namespace.name -}}
{{- end -}}

{{/* Mode helpers */}}
{{- define "rhacs-manager.isHub" -}}
{{- eq (default "hub" .Values.mode) "hub" -}}
{{- end -}}

{{- define "rhacs-manager.isSpoke" -}}
{{- eq (default "hub" .Values.mode) "spoke" -}}
{{- end -}}
