
## Fix: Backup and Restore Crash ("Something went wrong")

### Root Cause Analysis

The restore crashes the entire app (triggering the global ErrorBoundary) due to multiple cascading issues:

**1. Missing Foreign Key Cleanup (Delete Phase)**
Several dependent tables are NOT cleaned up before parent tables are deleted, causing FK constraint violations that prevent proper deletion:
- `loan_payments.transaction_id` references `transactions` -- not cleaned before deleting transactions
- `transactions.family_member_id` references `family_members` -- not cleaned before deleting family
- `device_service_history.task_id` references `tasks` -- not cleaned before deleting tasks

When deletes fail silently (FK violations), the old records remain. The subsequent inserts then fail with duplicate primary key errors because the backup data includes original record IDs.

**2. No Error Boundary Around Settings Content**
The entire app is wrapped in a single global ErrorBoundary. When the page reloads after a partial restore (line 625: `window.location.reload()`), the app renders with inconsistent data (e.g., tasks referencing deleted categories), which can crash during render and trigger the global error page.

**3. Import Function Only Imports Tasks and Goals**
The `importJSON` function (for "JSON backup" import) only handles tasks and goals, silently ignoring all other data types. While it strips IDs correctly, it doesn't strip computed fields or handle FK references.

### Fix Plan

#### Step 1: Add Comprehensive FK Cleanup Before Deletes
Add cleanup for ALL dependent tables before their parent tables are deleted:
- Delete `loan_payments` (with transaction_id references) before deleting `transactions`
- Nullify or delete `transactions` with `family_member_id` before deleting `family_members`
- Delete `device_service_history` entries referencing user's tasks before deleting `tasks`

#### Step 2: Use Upsert Instead of Insert for Restore
Change all restore inserts from `.insert()` to `.upsert()` with `onConflict: 'id'`. This handles the case where records weren't fully deleted by updating them instead of failing on duplicate keys.

#### Step 3: Strip Problematic Fields from Restore Data
Expand the `stripFields` list to include all computed/generated columns and fields that could cause FK issues:
- `search_vector` (computed column on notes)
- `created_at`, `updated_at` (let DB set these fresh)

#### Step 4: Wrap Settings Content in SectionErrorBoundary
Wrap the DataExport component (and the Settings page content area) in a `SectionErrorBoundary` so that restore errors don't crash the entire app -- only the settings section shows an error with a retry option.

#### Step 5: Add Global Unhandled Rejection Handler
Add a `window.addEventListener('unhandledrejection', ...)` handler in App.tsx to catch any stray async errors that slip through try/catch blocks, preventing them from crashing the app.

#### Step 6: Remove Auto-Reload After Restore
Remove the `window.location.reload()` after restore. Instead, just show a success toast. The user can manually refresh if needed. This prevents crashes from loading the app with inconsistent data.

### Technical Details

**Files to modify:**

1. **`src/components/settings/DataExport.tsx`**:
   - Add `loan_payments` cleanup before `transactions` delete
   - Add `transactions` family_member_id nullification before `family` delete
   - Change `.insert()` to `.upsert()` with `onConflict: 'id'` in `executeSelectiveRestore`
   - Add `created_at` and `updated_at` to `stripFields`
   - Remove `window.location.reload()` 
   - Wrap the entire function body in additional error safety

2. **`src/pages/Settings.tsx`**:
   - Import and wrap `renderContent()` output in `SectionErrorBoundary`

3. **`src/App.tsx`**:
   - Add `unhandledrejection` event listener in `AppContent` to catch stray async errors
