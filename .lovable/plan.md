

## Fix: Self-Hosted Docker Admin Login (500 Error)

### Root Cause Analysis

There are **two critical issues** causing the 500 Internal Server Error:

**1. Schema Conflict between `init-db.sql` and backend `server.js`**

The `init-db.sql` (run by Postgres on first boot) creates the `user_roles` table with column type `app_role` (a custom ENUM). But when the backend's `seedDefaultAdmin()` tries to insert or query roles, it treats them as plain strings. More importantly, `init-db.sql` creates `password_hash` as `VARCHAR(255)` which is too short for the PBKDF2 hash format (`salt:hash` = 16-byte salt hex + `:` + 64-byte hash hex = 161 chars, fits, but is tight). The real problem: the admin user is inserted by `init-db.sql` with `password_hash = 'placeholder_will_be_updated_by_backend'`, and then `seedDefaultAdmin()` tries to UPDATE it, but if `seedDefaultAdmin()` fails for any reason, the placeholder hash remains.

**2. `seedDefaultAdmin()` silently swallows errors**

The function catches all errors and only logs them. If the database connection is slow or the `init-db.sql` hasn't fully completed, the seed function fails silently, leaving the admin with an un-usable placeholder password hash. Any subsequent login attempt then hits `verifyPassword` which works but returns false (401) -- OR if the schema mismatch causes a query error, it returns 500.

### Fix Plan

#### Step 1: Simplify `init-db.sql` - Remove admin seeding
Remove the admin user creation from `init-db.sql` entirely. Let the backend handle ALL admin seeding on startup. This eliminates the dual-seeding conflict. Also change `password_hash` to `TEXT` to avoid any length issues.

#### Step 2: Fix `seedDefaultAdmin()` in `server.js`
- Add retry logic (wait for DB to be fully ready)
- Add detailed error logging so failures are visible in `docker logs`
- Ensure the function creates the admin user from scratch if not found
- Use `ON CONFLICT (email) DO UPDATE` instead of `DO NOTHING` to always update the hash

#### Step 3: Fix `app_settings` seeding
The backend's `seedDefaultAdmin` inserts `app_settings` with `id = uuid()` but `init-db.sql` uses `id = 'default'`. The frontend queries `id=eq.default`. Fix the backend to use `id = 'default'` consistently.

#### Step 4: Add startup health logging
Add clear console output showing whether DB connection, schema init, and admin seeding all succeeded, so issues are visible in `docker logs lifeos-backend`.

### Technical Details

**Files to modify:**

1. **`docker/init-db.sql`**: Remove the admin user seeding DO block at the bottom. Keep only schema creation (tables, indexes, triggers). Change `password_hash VARCHAR(255)` to `password_hash TEXT`.

2. **`docker/backend/server.js`**:
   - Fix `seedDefaultAdmin()` to use `id = 'default'` for `app_settings`
   - Add retry logic with delay for DB readiness
   - Add explicit error messages for each step
   - Ensure `ON CONFLICT (email) DO UPDATE SET password_hash = $2` is used

3. **`nginx.conf`**: No changes needed (previous fix was correct).

### After applying, run:
```text
docker-compose down -v
docker-compose up --build -d
docker logs lifeos-backend   # verify "Default admin user seeded" appears
```

