#!/usr/bin/env bash
set -euo pipefail

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          LifeOS - Personal Life Management System          ║"
echo "║              Docker Version - Starting...                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if license key is provided
if [ -z "${APP_LICENSE_KEY:-}" ]; then
    echo "⚠️  WARNING: No license key provided!"
    echo "    Set APP_LICENSE_KEY in docker-compose.yml"
    echo "    Application will require license activation during setup."
    echo ""
else
    echo "✓ License key detected"
    echo "  License will be validated on first access"
    echo ""
fi

# Check for headless admin setup
if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
    echo "✓ Admin credentials detected (headless setup mode)"
    echo "  Admin account will be created automatically"
    echo ""
fi

# Verify critical files exist
echo "→ Verifying application integrity..."
CRITICAL_FILES=(
    "/app/server.js"
    "/app/package.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "✗ CRITICAL ERROR: Missing file: $file"
        echo "  Application cannot start without all core files."
        exit 1
    fi
done
echo "✓ All critical files present"
echo ""

# Set secure permissions
echo "→ Setting secure file permissions..."
chmod 644 /app/server.js
chmod 644 /app/package.json
echo "✓ Permissions configured"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "  LifeOS is starting on port ${API_PORT:-3001}"
echo "  Backend API: http://localhost:${API_PORT:-3001}"
echo ""
echo "  On first run, visit the frontend to complete setup:"
echo "    1. Create admin account"
echo "    2. Enter license key"
echo "════════════════════════════════════════════════════════════"
echo ""

exec node /app/server.js
