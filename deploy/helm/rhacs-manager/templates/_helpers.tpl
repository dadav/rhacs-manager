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

{{/*
Image tag helper — returns the tag or falls back to Chart.AppVersion.
Usage: include "rhacs-manager.imageTag" (dict "tag" .Values.xxx.image.tag "chart" .Chart)
*/}}
{{- define "rhacs-manager.imageTag" -}}
{{- default .chart.AppVersion .tag -}}
{{- end -}}

{{/*
Frontend 3-container pod spec (shared between hub and spoke).
Expects a dict with keys: oauthProxy, authHeaderInjector, frontend, secret, global, Chart, podSecurityContext, securityContext, podAnnotations, nodeSelector, tolerations, affinity.
*/}}
{{/*
oauthProxyPodSpec renders a 3-container pod: oauth-proxy → auth-header-injector → app.
Optionally adds extra sidecar containers when .extraContainers is provided.

Required context keys:
  .deploymentName, .selectorLabels, .podAnnotations, .oauthProxy, .authHeaderInjector,
  .app (the backend container config with: name, image, port, env, envFrom, command,
        resources, readinessProbe, livenessProbe, securityContext),
  .secretName, .imagePullSecrets, .podSecurityContext, .securityContext,
  .nodeSelector, .tolerations, .affinity, .topologySpreadConstraints, .chart
Optional:
  .extraContainers (list of additional container specs to append to the pod)
*/}}
{{- define "rhacs-manager.oauthProxyPodSpec" -}}
metadata:
  labels:
    app: {{ .deploymentName }}
    {{- .selectorLabels | nindent 4 -}}
  {{- with .podAnnotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  serviceAccountName: {{ .oauthProxy.serviceAccountName }}
  {{- with .imagePullSecrets }}
  imagePullSecrets:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .podSecurityContext }}
  securityContext:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  containers:
    - name: oauth-proxy
      image: "{{ .oauthProxy.image.repository }}:{{ .oauthProxy.image.tag }}"
      imagePullPolicy: {{ .oauthProxy.image.pullPolicy }}
      args:
        - --https-address=:8443
        {{- if .mcpPlainHttp }}
        - --http-address=:{{ .mcpPlainHttpPort }}
        - --cookie-secure=false
        - '--openshift-delegate-urls={"/":{"resource":"services","verb":"get","namespace":"{{ .mcpDelegateNamespace }}","name":"{{ .mcpDelegateServiceName }}"}}'
        {{- end }}
        - --provider=openshift
        - --openshift-service-account={{ .oauthProxy.serviceAccountName }}
        - --upstream=http://localhost:8081
        - --tls-cert=/etc/tls/private/tls.crt
        - --tls-key=/etc/tls/private/tls.key
        - --cookie-secret={{ .oauthProxy.cookieSecret }}
        - --pass-user-headers=true
        - --pass-access-token=true
        - --cookie-refresh={{ .oauthProxy.cookieRefresh | default "12h" }}
      ports:
        - containerPort: 8443
          name: oauth-proxy
        {{- if .mcpPlainHttp }}
        - containerPort: {{ .mcpPlainHttpPort }}
          name: mcp-http
        {{- end }}
      volumeMounts:
        - name: proxy-tls
          mountPath: /etc/tls/private
          readOnly: true
      {{- with .oauthProxy.securityContext }}
      securityContext:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      resources:
        {{- toYaml .oauthProxy.resources | nindent 8 }}

    - name: auth-header-injector
      image: "{{ .authHeaderInjector.image.repository }}:{{ include "rhacs-manager.imageTag" (dict "tag" .authHeaderInjector.image.tag "chart" .chart) }}"
      imagePullPolicy: {{ .authHeaderInjector.image.pullPolicy }}
      ports:
        - containerPort: 8081
      env:
        - name: UPSTREAM_ADDR
          value: "http://localhost:{{ .app.port }}"
        - name: CLUSTER_NAME
          valueFrom:
            secretKeyRef:
              name: {{ .secretName }}
              key: CLUSTER_NAME
        - name: NAMESPACE_ANNOTATION
          value: {{ .authHeaderInjector.namespaceAnnotation | quote }}
        - name: GROUP_ANNOTATION
          value: {{ .authHeaderInjector.groupAnnotation | quote }}
        - name: EMAIL_ANNOTATION
          value: {{ .authHeaderInjector.emailAnnotation | quote }}
        - name: CACHE_TTL_SECONDS
          value: {{ .authHeaderInjector.cacheTtlSeconds | quote }}
        - name: GROUP_CACHE_TTL_SECONDS
          value: {{ .authHeaderInjector.groupCacheTtlSeconds | quote }}
        {{- if .authHeaderInjector.allNamespacesGroups }}
        - name: ALL_NAMESPACES_GROUPS
          value: {{ .authHeaderInjector.allNamespacesGroups | quote }}
        {{- end }}
      {{- with .authHeaderInjector.securityContext }}
      securityContext:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      resources:
        {{- toYaml .authHeaderInjector.resources | nindent 8 }}
      readinessProbe:
        httpGet:
          path: {{ .authHeaderInjector.readinessProbe.path }}
          port: 8081
        initialDelaySeconds: {{ .authHeaderInjector.readinessProbe.initialDelaySeconds }}
        periodSeconds: {{ .authHeaderInjector.readinessProbe.periodSeconds }}
        timeoutSeconds: {{ .authHeaderInjector.readinessProbe.timeoutSeconds }}
        failureThreshold: {{ .authHeaderInjector.readinessProbe.failureThreshold }}
        successThreshold: {{ .authHeaderInjector.readinessProbe.successThreshold }}

    - name: {{ .app.name }}
      image: "{{ .app.image.repository }}:{{ include "rhacs-manager.imageTag" (dict "tag" .app.image.tag "chart" .chart) }}"
      imagePullPolicy: {{ .app.image.pullPolicy }}
      {{- with .app.command }}
      command:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      ports:
        - containerPort: {{ .app.port }}
      {{- with .app.env }}
      env:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .app.envFrom }}
      envFrom:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .securityContext }}
      securityContext:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      resources:
        {{- toYaml .app.resources | nindent 8 }}
      {{- with .app.readinessProbe }}
      readinessProbe:
        httpGet:
          path: {{ .path }}
          port: {{ $.app.port }}
        initialDelaySeconds: {{ .initialDelaySeconds }}
        periodSeconds: {{ .periodSeconds }}
        timeoutSeconds: {{ .timeoutSeconds }}
        failureThreshold: {{ .failureThreshold }}
        successThreshold: {{ .successThreshold }}
      {{- end }}
      {{- with .app.livenessProbe }}
      livenessProbe:
        httpGet:
          path: {{ .path }}
          port: {{ $.app.port }}
        initialDelaySeconds: {{ .initialDelaySeconds }}
        periodSeconds: {{ .periodSeconds }}
        timeoutSeconds: {{ .timeoutSeconds }}
        failureThreshold: {{ .failureThreshold }}
        successThreshold: {{ .successThreshold }}
      {{- end }}

  {{- with .extraContainers }}
    {{- toYaml . | nindent 4 }}
  {{- end }}

  {{- with .nodeSelector }}
  nodeSelector:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .tolerations }}
  tolerations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .affinity }}
  affinity:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  {{- with .topologySpreadConstraints }}
  topologySpreadConstraints:
    {{- toYaml . | nindent 4 }}
  {{- end }}
  volumes:
    - name: proxy-tls
      secret:
        secretName: {{ .oauthProxy.tlsSecretName }}
{{- end -}}
