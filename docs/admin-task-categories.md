# Admin Task Categories Feature

## Overview

The admin task categories feature allows administrators to create task categories that are visible to all users, but only admins can edit or delete them. Tasks in admin categories can be viewed by all users but cannot be modified by non-admin users.

## How It Works

### Database Schema

#### Task Categories Table
- **`is_admin_category`** (boolean): Marks whether a category is admin-managed
  - When `true`: Category is visible to all users, but only editable by admins
  - When `false`: Category is private to the user who created it

#### Tasks Table
- **`is_admin_task`** (boolean): Automatically set based on the category's `is_admin_category` flag
  - When `true`: Task is visible to all users, but only editable by admins
  - When `false`: Task is private to the user who created it

### Row Level Security (RLS) Policies

#### Task Categories

1. **View Policy**: 
   - Users can view admin categories (`is_admin_category = true`)
   - Users can view their own personal categories

2. **Create/Update/Delete Policy**:
   - Admins can manage all categories
   - Users can only manage their own non-admin categories

#### Tasks

1. **View Policy**:
   - Users can view their own tasks
   - Users can view ALL admin tasks (from all users)

2. **Create Policy**:
   - Users can create their own tasks
   - Only admins can create admin tasks

3. **Update Policy**:
   - Users can update their own non-admin tasks
   - Admins can update any admin task
   - Regular users CANNOT update admin tasks (read-only)

4. **Delete Policy**:
   - Users can delete their own non-admin tasks
   - Admins can delete any admin task
   - Regular users CANNOT delete admin tasks

### Automatic Sync Trigger

A database trigger (`set_is_admin_task_trigger`) automatically sets the `is_admin_task` flag based on the task's category:

```sql
CREATE TRIGGER set_is_admin_task_trigger
  BEFORE INSERT OR UPDATE OF category_id
  ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_is_admin_task();
```

This ensures:
- When a task is assigned to an admin category, it becomes an admin task automatically
- When a task's category changes, the `is_admin_task` flag updates accordingly
- Tasks without categories are never admin tasks

## User Experience

### For Admin Users

1. **Creating Categories**:
   - When an admin creates a category, it's automatically marked as an admin category
   - The category shows an "Admin" badge in the UI

2. **Managing Admin Categories**:
   - Admins can edit and delete admin categories
   - Edit/delete buttons are visible for all admin categories

3. **Admin Tasks**:
   - Tasks in admin categories are automatically marked as admin tasks
   - Admins can create, edit, and delete these tasks
   - Admins can see tasks from all users in admin categories

### For Regular Users

1. **Viewing Admin Categories**:
   - Admin categories appear in their category list
   - Categories show an "Admin" badge
   - Edit/delete buttons are NOT visible for admin categories

2. **Using Admin Categories**:
   - Users can assign their tasks to admin categories
   - Users can filter/view tasks by admin categories

3. **Viewing Admin Tasks**:
   - Users can see ALL tasks in admin categories (from all users)
   - This enables team-wide visibility for shared task categories
   - Users CANNOT edit or delete admin tasks created by others

4. **Creating Personal Categories**:
   - Users can still create their own private categories
   - These categories remain private and fully editable by the user

## Use Cases

### 1. Department-Wide Task Categories
Admin creates "IT Support", "HR Tasks", "Finance" categories that all employees can see and use for organization-wide task management.

### 2. Team Task Boards
Admin creates shared categories for projects where all team members need to see all tasks but only admins/project managers can modify them.

### 3. Compliance Tasks
Admin creates categories for mandatory compliance tasks that everyone must see but shouldn't be able to delete or modify.

### 4. Resource Allocation
Management can create admin categories to track resource allocation across the organization, with everyone able to see but not modify the allocations.

## Implementation Details

### Files Modified/Created

1. **Database Migration**: `supabase/migrations/20260120033800_admin_tasks_view_all_users.sql`
   - Adds `is_admin_task` column to tasks table
   - Creates comprehensive RLS policies
   - Implements automatic sync trigger
   - Updates existing tasks

2. **Frontend Hook**: `src/hooks/useTaskCategories.ts`
   - Already handles admin categories
   - Implements `canEditCategory()` function
   - Loads both personal and admin categories

3. **UI Component**: `src/components/tasks/TaskCategoryManager.tsx`
   - Displays admin badge for admin categories
   - Conditionally shows edit/delete buttons based on permissions
   - Uses `canEditCategory()` for access control

### API Behavior

- **Query**: When fetching tasks, users automatically see their own tasks + all admin tasks
- **Insert**: Task's `is_admin_task` flag is set automatically by trigger
- **Update**: RLS prevents non-admins from updating admin tasks
- **Delete**: RLS prevents non-admins from deleting admin tasks

## Testing Checklist

- [ ] Admin can create admin categories
- [ ] Admin can edit admin categories
- [ ] Admin can delete admin categories
- [ ] Regular user can see admin categories
- [ ] Regular user CANNOT edit admin categories
- [ ] Regular user CANNOT delete admin categories
- [ ] Admin tasks appear for all users
- [ ] Regular users can view but not edit admin tasks
- [ ] Task automatically becomes admin task when assigned to admin category
- [ ] Task automatically becomes personal when moved to personal category
- [ ] Users can still create and manage their personal categories
- [ ] Users can still create and manage their personal tasks

## Migration Path

Existing tasks are automatically migrated:
- Tasks with admin categories → marked as admin tasks
- Tasks with personal categories → remain personal tasks
- Tasks without categories → remain personal tasks

No manual data migration required.
