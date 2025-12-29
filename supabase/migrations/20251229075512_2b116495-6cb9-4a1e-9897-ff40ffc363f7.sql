-- ================================================
-- PRANTO LIFE OS - Complete Database Schema
-- Personal productivity & finance management
-- ================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- CORE TABLES
-- ================================================

-- Budget Categories
CREATE TABLE public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_income BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMPTZ,
  due_time TEXT,
  tags TEXT[] DEFAULT '{}',
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern TEXT CHECK (recurring_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  estimated_time INTEGER, -- in minutes
  project_id UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task Checklists
CREATE TABLE public.task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notes
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  is_vault BOOLEAN DEFAULT false,
  encrypted_content TEXT, -- For vault notes
  project_id UUID,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create search index for notes
CREATE INDEX notes_search_idx ON public.notes USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION public.update_notes_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector
CREATE TRIGGER notes_search_vector_update
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notes_search_vector();

-- Transactions (Income/Expense)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  merchant TEXT,
  notes TEXT,
  account TEXT DEFAULT 'cash',
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern TEXT CHECK (recurring_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monthly Budgets
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, month, year)
);

-- Salary Entries
CREATE TABLE public.salary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000),
  gross_amount DECIMAL(12, 2) NOT NULL,
  allowances DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Investments
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('dps', 'fdr', 'stocks', 'crypto', 'business', 'mutual_fund', 'bonds', 'real_estate', 'other')),
  principal DECIMAL(14, 2) NOT NULL,
  current_value DECIMAL(14, 2),
  purchase_date DATE,
  maturity_date DATE,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_amount DECIMAL(12, 2),
  recurring_pattern TEXT CHECK (recurring_pattern IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goals
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'personal' CHECK (category IN ('family', 'career', 'finance', 'health', 'learning', 'personal')),
  target_amount DECIMAL(14, 2),
  current_amount DECIMAL(14, 2) DEFAULT 0,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  is_next_year_plan BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goal Milestones
CREATE TABLE public.goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects / Ideas
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'researching', 'building', 'paused', 'done', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  target_date DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for tasks and notes to projects
ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD CONSTRAINT notes_project_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- Attachments
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'note', 'transaction', 'investment', 'project')),
  entity_id UUID NOT NULL,
  is_vault BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Sessions (for session management)
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  ip_address TEXT,
  last_active TIMESTAMPTZ DEFAULT now(),
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'Asia/Dhaka',
  currency TEXT DEFAULT 'BDT',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX tasks_status_idx ON public.tasks(status);
CREATE INDEX tasks_due_date_idx ON public.tasks(due_date);
CREATE INDEX tasks_project_id_idx ON public.tasks(project_id);

CREATE INDEX notes_user_id_idx ON public.notes(user_id);
CREATE INDEX notes_project_id_idx ON public.notes(project_id);
CREATE INDEX notes_tags_idx ON public.notes USING GIN(tags);

CREATE INDEX transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX transactions_date_idx ON public.transactions(date);
CREATE INDEX transactions_category_id_idx ON public.transactions(category_id);
CREATE INDEX transactions_type_idx ON public.transactions(type);

CREATE INDEX investments_user_id_idx ON public.investments(user_id);
CREATE INDEX investments_type_idx ON public.investments(type);

CREATE INDEX goals_user_id_idx ON public.goals(user_id);
CREATE INDEX goals_status_idx ON public.goals(status);

CREATE INDEX projects_user_id_idx ON public.projects(user_id);
CREATE INDEX projects_status_idx ON public.projects(status);

CREATE INDEX audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs(created_at);

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

-- Budget Categories
CREATE POLICY "Users can CRUD own budget_categories" ON public.budget_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Users can CRUD own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Task Checklists
CREATE POLICY "Users can CRUD own task_checklists" ON public.task_checklists
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notes
CREATE POLICY "Users can CRUD own notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can CRUD own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Budgets
CREATE POLICY "Users can CRUD own budgets" ON public.budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Salary Entries
CREATE POLICY "Users can CRUD own salary_entries" ON public.salary_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Investments
CREATE POLICY "Users can CRUD own investments" ON public.investments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Goals
CREATE POLICY "Users can CRUD own goals" ON public.goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Goal Milestones
CREATE POLICY "Users can CRUD own goal_milestones" ON public.goal_milestones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Projects
CREATE POLICY "Users can CRUD own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Attachments
CREATE POLICY "Users can CRUD own attachments" ON public.attachments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Audit Logs (read-only for users, insert via trigger)
CREATE POLICY "Users can view own audit_logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Sessions
CREATE POLICY "Users can CRUD own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Profiles
CREATE POLICY "Users can CRUD own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE ON public.budget_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_task_checklists_updated_at BEFORE UPDATE ON public.task_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_salary_entries_updated_at BEFORE UPDATE ON public.salary_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goal_milestones_updated_at BEFORE UPDATE ON public.goal_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- SEED DEFAULT BUDGET CATEGORIES FUNCTION
-- ================================================
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.budget_categories (user_id, name, icon, color, is_income) VALUES
    (NEW.id, 'Salary', 'Briefcase', '#22c55e', true),
    (NEW.id, 'Freelance', 'Laptop', '#10b981', true),
    (NEW.id, 'Investment', 'TrendingUp', '#06b6d4', true),
    (NEW.id, 'Food', 'Utensils', '#f97316', false),
    (NEW.id, 'Transport', 'Car', '#8b5cf6', false),
    (NEW.id, 'Shopping', 'ShoppingBag', '#ec4899', false),
    (NEW.id, 'Bills', 'Receipt', '#ef4444', false),
    (NEW.id, 'Family', 'Heart', '#f43f5e', false),
    (NEW.id, 'Health', 'Activity', '#14b8a6', false),
    (NEW.id, 'Entertainment', 'Gamepad2', '#a855f7', false),
    (NEW.id, 'Savings', 'PiggyBank', '#22d3ee', false),
    (NEW.id, 'Other', 'MoreHorizontal', '#6b7280', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_user_created_seed_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();