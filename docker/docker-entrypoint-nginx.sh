#!/bin/sh
# Replace Supabase URL placeholder with actual runtime URL
# Default: http://localhost:3377 (Docker default port)
# Override via LIFEOS_URL env var for remote access (e.g., http://192.168.1.100:3377)

LIFEOS_URL="${LIFEOS_URL:-http://localhost:3377}"

echo "LifeOS: Setting Supabase proxy URL to: ${LIFEOS_URL}"

# Replace placeholder in all compiled JS files
find /usr/share/nginx/html/assets -name '*.js' -exec sed -i "s|__LIFEOS_URL_PLACEHOLDER__|${LIFEOS_URL}|g" {} +

# Start nginx
exec nginx -g 'daemon off;'
