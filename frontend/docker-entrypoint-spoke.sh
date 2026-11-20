#!/bin/sh
set -e

export PROXY_TIMEOUT_SECONDS="${PROXY_TIMEOUT_SECONDS:-180}"
case "$PROXY_TIMEOUT_SECONDS" in
    *[!0-9]*|'')
        echo "PROXY_TIMEOUT_SECONDS must be a positive integer" >&2
        exit 1
        ;;
esac
if [ "$PROXY_TIMEOUT_SECONDS" -le 0 ]; then
    echo "PROXY_TIMEOUT_SECONDS must be a positive integer" >&2
    exit 1
fi

# Substitute environment variables into nginx config template
# HUB_API_URL: full URL of the hub backend API (e.g. https://rhacs-manager-api.hub.example.com)
# SPOKE_API_KEY: API key for authenticating to the hub backend
envsubst '${HUB_API_URL} ${SPOKE_API_KEY} ${PROXY_TIMEOUT_SECONDS}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
