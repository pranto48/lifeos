

## Analysis: Docker Backup & Restore Failure

### Root Cause

The `DataExport.tsx` component calls `supabase.from('tasks').select(...)`, `supabase.from('tasks').insert(...)`, `supabase.from('goals').upsert(...)`, etc. for ALL backup, import, and restore operations. In Docker self-hosted mode, there is no Supabase instance — the backend is a plain Node.js API server. The backend currently has **zero data CRUD routes** (only auth, setup, license, and health endpoints). Every Supabase call silently fails or errors out.

### Plan

#### A. Add generic CRUD API endpoints to the backend (`docker/backend/server.js`)

Add three new routes that the frontend can use for data operations:

1. **`GET /api/data/:table`** — Select all rows for the authenticated user from a given table
2. **`POST /api/data/:table`** — Insert rows (bulk) into a table for the authenticated user  
3. **`POST /api/data/:table/upsert`** — Upsert rows (bulk) by ID for the authenticated user
4. **`DELETE /api/data/:table`** — Delete all rows for the authenticated user from a table
5. **`POST /api/data/:table/update`** — Update specific rows (for nullifying FK references during restore cleanup)

These routes will:
- Require authentication (JWT token)
- Whitelist only known data tables (tasks, notes, goals, transactions, etc.) to prevent SQL injection
- Automatically scope all queries to the authenticated user's `user_id`

#### B. Add a self-hosted data API client (`src/lib/selfHostedConfig.ts`)

Extend the `SelfHostedApi` class with methods:
- `selectAll(table)` — GET from `/api/data/:table`
- `insertBatch(table, rows)` — POST to `/api/data/:table` with batching (500 rows per batch)
- `upsertBatch(table, rows)` — POST to `/api/data/:table/upsert` with batching
- `deleteAll(table)` — DELETE `/api/data/:table`
- `updateWhere(table, updates, filters)` — POST `/api/data/:table/update`

#### C. Make `DataExport.tsx` dual-mode

Update all data operations in `DataExport.tsx` to check `isSelfHosted()`:
- **Backup/Export**: If self-hosted, use `selfHostedApi.selectAll()` instead of `supabase.from().select()`
- **Import**: If self-hosted, use `selfHostedApi.insertBatch()` instead of `supabase.from().insert()`
- **Restore**: If self-hosted, use `selfHostedApi.deleteAll()` + `selfHostedApi.upsertBatch()` instead of Supabase equivalents
- **Cleanup steps** (nullify FKs, delete dependents): Use `selfHostedApi.updateWhere()` and `selfHostedApi.deleteAll()`

Batch processing (500 rows per request) will be built into the API client to prevent timeouts with large datasets.

#### D. Exempt data routes from license check during restore

Add the data API routes to `LICENSE_EXEMPT_ROUTES` — or rather, they should require auth but pass through license middleware normally. Actually, they should go through license check. No change needed here since authenticated data routes should be subject to license enforcement as normal.

### Technical Details

**Whitelisted tables for the CRUD API:**
```text
tasks, notes, transactions, goals, investments, projects,
salary_entries, habits, family_members, family_events,
budgets, budget_categories, task_categories,
habit_completions, goal_milestones, project_milestones,
task_checklists, task_follow_up_notes, task_assignments,
family_member_connections, family_documents,
loan_payments, device_service_history, backup_schedules
```

**Backend route matching change:**
The current router uses exact string matching (`routes[routeKey]`). Since we need parameterized routes (`/api/data/:table`), we'll add prefix-based matching for `/api/data/` paths before the exact-match lookup.

**Files to modify:**
- `docker/backend/server.js` — Add CRUD routes + parameterized routing
- `src/lib/selfHostedConfig.ts` — Add data API methods to SelfHostedApi
- `src/components/settings/DataExport.tsx` — Add self-hosted branching for all data operations

