-- LifeOS Data Tables for Self-Hosted installations
-- These tables store the main application data (tasks, notes, goals, etc.)

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    due_date DATE,
    due_time TIME,
    completed_at TIMESTAMPTZ,
    category_id UUID,
    project_id UUID,
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern TEXT,
    tags TEXT[],
    task_type TEXT DEFAULT 'office',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    encrypted_content TEXT,
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    is_vault BOOLEAN DEFAULT false,
    note_type TEXT DEFAULT 'note',
    project_id UUID,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category_id UUID,
    merchant TEXT,
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    account TEXT DEFAULT 'cash',
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern TEXT,
    attachment_url TEXT,
    family_member_id UUID,
    linked_entity_id UUID,
    linked_entity_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    goal_type TEXT DEFAULT 'office',
    category TEXT DEFAULT 'personal',
    status TEXT DEFAULT 'active',
    target_amount NUMERIC,
    current_amount NUMERIC DEFAULT 0,
    target_date DATE,
    is_next_year_plan BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investments
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    principal NUMERIC NOT NULL,
    current_value NUMERIC,
    purchase_date DATE,
    maturity_date DATE,
    is_recurring BOOLEAN DEFAULT false,
    recurring_amount NUMERIC,
    recurring_pattern TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'idea',
    priority TEXT DEFAULT 'medium',
    project_type TEXT DEFAULT 'office',
    tags TEXT[] DEFAULT '{}',
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Salary Entries
CREATE TABLE IF NOT EXISTS public.salary_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    gross_amount NUMERIC NOT NULL,
    net_amount NUMERIC NOT NULL,
    allowances NUMERIC,
    deductions NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'CheckCircle',
    color TEXT DEFAULT '#22c55e',
    frequency TEXT DEFAULT 'daily',
    target_per_day INTEGER DEFAULT 1,
    is_archived BOOLEAN DEFAULT false,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_time TIME DEFAULT '08:00:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Members
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    date_of_birth DATE,
    avatar_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Events
CREATE TABLE IF NOT EXISTS public.family_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    event_type TEXT DEFAULT 'birthday',
    event_date DATE NOT NULL,
    family_member_id UUID,
    reminder_days INTEGER DEFAULT 7,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Categories
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_income BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    category_id UUID,
    amount NUMERIC DEFAULT 0,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Categories
CREATE TABLE IF NOT EXISTS public.task_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit Completions
CREATE TABLE IF NOT EXISTS public.habit_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL,
    user_id UUID NOT NULL,
    completed_at DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal Milestones
CREATE TABLE IF NOT EXISTS public.goal_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Milestones
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Checklists
CREATE TABLE IF NOT EXISTS public.task_checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Follow-up Notes
CREATE TABLE IF NOT EXISTS public.task_follow_up_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Assignments
CREATE TABLE IF NOT EXISTS public.task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    assigned_by UUID NOT NULL,
    assigned_to UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    message TEXT,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Member Connections
CREATE TABLE IF NOT EXISTS public.family_member_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    member_id_1 UUID NOT NULL,
    member_id_2 UUID NOT NULL,
    connection_type TEXT DEFAULT 'spouse',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family Documents
CREATE TABLE IF NOT EXISTS public.family_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    family_member_id UUID,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    lender_name TEXT NOT NULL,
    loan_type TEXT DEFAULT 'personal',
    principal_amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    remaining_amount NUMERIC NOT NULL,
    interest_rate NUMERIC,
    monthly_payment NUMERIC,
    payment_frequency TEXT DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    next_payment_date DATE,
    status TEXT DEFAULT 'active',
    reminder_days INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan Payments
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    loan_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMPTZ,
    transaction_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup Schedules
CREATE TABLE IF NOT EXISTS public.backup_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    frequency TEXT NOT NULL,
    day_of_week INTEGER,
    day_of_month INTEGER,
    last_backup_at TIMESTAMPTZ,
    next_backup_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data tables
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_events_user_id ON public.family_events(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_user_id ON public.task_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_completions_user_id ON public.habit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_user_id ON public.backup_schedules(user_id);
