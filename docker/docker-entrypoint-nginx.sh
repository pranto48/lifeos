#!/bin/sh
# Replace Supabase URL placeholder with actual runtime URL
# Default: http://localhost:3377 (Docker default port)
# Override via LIFEOS_URL env var for remote access (e.g., http://192.168.1.100:3377)
# Supports both HTTP and HTTPS:
#   LIFEOS_URL=http://localhost:3377
#   LIFEOS_URL=https://lifeos.example.com

LIFEOS_URL="${LIFEOS_URL:-http://localhost:3377}"

echo "LifeOS: Setting Supabase proxy URL to: ${LIFEOS_URL}"

# Replace placeholder in all compiled JS files
find /usr/share/nginx/html/assets -name '*.js' -exec sed -i "s|__LIFEOS_URL_PLACEHOLDER__|${LIFEOS_URL}|g" {} +

# If SSL certificate files are mounted, enable HTTPS
if [ -f /etc/nginx/ssl/cert.pem ] && [ -f /etc/nginx/ssl/key.pem ]; then
  echo "LifeOS: SSL certificates detected — enabling HTTPS"
  cat > /etc/nginx/conf.d/ssl.conf << 'SSLEOF'
server {
    listen 443 ssl;
    server_name _;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        set $backend_upstream http://backend:3001;
        proxy_pass $backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
    }

    location /rest/v1/ {
        set $backend_upstream http://backend:3001;
        proxy_pass $backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header apikey $http_apikey;
        proxy_set_header Prefer $http_prefer;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
    }

    location /auth/v1/ {
        set $backend_upstream http://backend:3001;
        proxy_pass $backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header apikey $http_apikey;
        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
    }

    location /functions/v1/ {
        set $backend_upstream http://backend:3001;
        proxy_pass $backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header apikey $http_apikey;
        proxy_connect_timeout 5s;
        proxy_read_timeout 10s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /index.html {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
SSLEOF
  echo "LifeOS: HTTPS configuration written to /etc/nginx/conf.d/ssl.conf"
fi

# Start nginx
exec nginx -g 'daemon off;'
