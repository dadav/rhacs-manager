#!/bin/sh
set -e

# Substitute environment variables into nginx config template
# HUB_API_URL: full URL of the hub backend API (e.g. https://rhacs-manager-api.hub.example.com)
# SPOKE_API_KEY: API key for authenticating to the hub backend
envsubst '${HUB_API_URL} ${SPOKE_API_KEY}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
