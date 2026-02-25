

## Analysis: Backend Healthcheck Failure (179.7s timeout)

The backend container times out at exactly 180s (start_period 60s + retries 12 × interval 10s), which means **every single health check attempt fails**. The server.js code is correct -- it listens immediately and the `/api/health` endpoint returns 200. The problem is the health check command itself.

### Root Cause

The health check uses `wget`, but the `node:20-alpine` Docker image does not ship with `wget` (or only has a minimal busybox version that may not work with `--spider`). The health check command silently fails every attempt, Docker marks the container as unhealthy, and the dependent `lifeos-app` container refuses to start.

### Fix

Two changes needed:

**1. Backend Dockerfile** - Install `wget` explicitly so the health check command works:
```dockerfile
RUN apk add --no-cache wget
```

**2. Alternative (belt-and-suspenders)** - Also change the docker-compose health check to use `node` directly, since Node.js is guaranteed to be present:
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "const http = require('http'); http.get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"]
```

I will apply **both** fixes for maximum reliability.

### Files to modify
- `docker/backend/Dockerfile` - Add `apk add --no-cache wget`
- `docker-compose.yml` - Switch healthcheck from `wget` to `node` one-liner

