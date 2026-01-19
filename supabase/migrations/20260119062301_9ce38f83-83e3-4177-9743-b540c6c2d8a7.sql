-- Create support units table
CREATE TABLE public.support_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support departments table
CREATE TABLE public.support_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unit_id UUID NOT NULL REFERENCES public.support_units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support users table (organizational users, not website users)
CREATE TABLE public.support_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  department_id UUID NOT NULL REFERENCES public.support_departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  designation TEXT,
  device_info TEXT,
  ip_address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add support_user_id to tasks table
ALTER TABLE public.tasks ADD COLUMN support_user_id UUID REFERENCES public.support_users(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.support_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_units
CREATE POLICY "Users can CRUD own support_units"
ON public.support_units
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for support_departments
CREATE POLICY "Users can CRUD own support_departments"
ON public.support_departments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for support_users
CREATE POLICY "Users can CRUD own support_users"
ON public.support_users
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_support_departments_unit_id ON public.support_departments(unit_id);
CREATE INDEX idx_support_users_department_id ON public.support_users(department_id);
CREATE INDEX idx_tasks_support_user_id ON public.tasks(support_user_id);