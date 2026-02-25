

## Analysis: Docker 502 Bad Gateway on Login

### Root Causes Identified

After examining the full Docker stack (nginx.conf, docker/backend/server.js, docker-compose.yml, init-db.sql, Dockerfile), I found several issues causing the persistent 502:

**1. No outer error handling in HTTP request handler (server.js line 934)**
The HTTP handler is `async` but has no top-level try/catch. If any middleware or route throws an unexpected error, the response never completes and nginx sees a dead connection, returning 502.

**2. No backend health check endpoint or Docker healthcheck**
The `lifeos` (nginx) service depends on `backend` with `condition: service_started`, not `service_healthy`. Nginx can start proxying requests before the backend is actually listening and connected to the database. There is no `/api/health` endpoint.

**3. Startup timing: server.listen() waits for all initialization**
`server.listen()` only runs AFTER `connectWithRetry()` (up to 30s), `ensureSchema()`, `seedDefaultAdmin()`, and license verification. During this entire period, the backend is unreachable. Nginx proxies to it and gets connection refused (502).

**4. init-db.sql schema vs backend schema conflict**
`init-db.sql` creates `ip_address` as type `INET` in `user_sessions`, but the backend PG_SCHEMA defines it as plain `VARCHAR`. If `ensureSchema()` partially runs or the backend tries operations on these columns, silent errors may occur.

---

### Plan

#### A. Fix server.js - Error handling and startup order

1. **Move `server.listen()` to run FIRST**, before database connection. This ensures the backend is reachable immediately when nginx starts proxying.
2. **Add a `/api/health` endpoint** that returns the current backend state (starting, ready, error).
3. **Add a top-level try/catch** wrapping the entire HTTP handler to prevent unhandled async exceptions from killing the response.
4. **Add proper CORS + JSON error response** for any unhandled case.

#### B. Fix docker-compose.yml - Health checks

1. **Add a healthcheck** to the `backend` service using the new `/api/health` endpoint.
2. **Change `lifeos` (nginx) dependency** on `backend` from `service_started` to `service_healthy` so nginx only starts proxying when the backend is confirmed ready.

#### C. Fix init-db.sql - Schema consistency

1. **Align `user_sessions.ip_address`** type with what the backend expects (use `TEXT` instead of `INET` to avoid type mismatches).

#### D. Fix nginx.conf - Proxy error handling

1. **Add `proxy_connect_timeout` and `proxy_read_timeout`** directives with reasonable values.
2. **Add `proxy_next_upstream` error handling** so nginx returns a proper error instead of a raw 502 when the backend is temporarily unavailable.

---

### Technical Details

**server.js changes (startup reorder):**
```text
Before: connectWithRetry() → ensureSchema() → seedAdmin() → license → server.listen()
After:  server.listen() → connectWithRetry() → ensureSchema() → seedAdmin() → license
```
The health endpoint returns `{ status: "starting" }` until initialization completes, then `{ status: "ready" }`.

**server.js changes (error handling):**
```javascript
const server = http.createServer(async (req, res) => {
  try {
    // ... existing handler logic ...
  } catch (err) {
    console.error('Unhandled request error:', err);
    if (!res.headersSent) {
      sendJson(res, 500, { message: 'Internal server error' });
    }
  }
});
```

**docker-compose.yml backend healthcheck:**
```yaml
backend:
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/api/health"]
    interval: 5s
    timeout: 5s
    retries: 10
    start_period: 30s
```

**Files to modify:**
- `docker/backend/server.js` - Startup reorder, health endpoint, error handling
- `docker-compose.yml` - Backend healthcheck, frontend dependency
- `docker/init-db.sql` - Align ip_address column type
- `nginx.conf` - Proxy timeout and error handling directives

