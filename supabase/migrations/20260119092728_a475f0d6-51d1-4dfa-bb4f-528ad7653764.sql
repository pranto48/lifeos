-- ============================================
-- DEVICE INVENTORY SYSTEM
-- ============================================

-- Device Categories table
CREATE TABLE public.device_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_categories
CREATE POLICY "Users can CRUD own device_categories"
ON public.device_categories
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Device Inventory table with all required fields
CREATE TABLE public.device_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    support_user_id UUID REFERENCES public.support_users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.device_categories(id) ON DELETE SET NULL,
    
    -- Device identification
    device_name TEXT NOT NULL,
    serial_number TEXT,
    
    -- Purchase and delivery info
    purchase_date DATE,
    delivery_date DATE,
    supplier_name TEXT,
    requisition_number TEXT,
    bod_number TEXT,
    
    -- Warranty and cost
    warranty_date DATE,
    price NUMERIC,
    bill_details TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'available',
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_inventory
CREATE POLICY "Users can CRUD own device_inventory"
ON public.device_inventory
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Device Service History table
CREATE TABLE public.device_service_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_id UUID NOT NULL REFERENCES public.device_inventory(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    
    -- Service details
    service_date DATE NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    cost NUMERIC,
    technician_name TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_service_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_service_history
CREATE POLICY "Users can CRUD own device_service_history"
ON public.device_service_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TASK CATEGORIES - ADMIN MANAGED, SHARED VIEW
-- ============================================

-- Add is_admin_category column to track admin-created categories
ALTER TABLE public.task_categories ADD COLUMN IF NOT EXISTS is_admin_category BOOLEAN NOT NULL DEFAULT false;

-- Drop existing policy first
DROP POLICY IF EXISTS "Users can CRUD own task_categories" ON public.task_categories;

-- Create new policies for task categories
-- Admins can do everything
CREATE POLICY "Admins can manage all task_categories"
ON public.task_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view admin categories
CREATE POLICY "Users can view admin task_categories"
ON public.task_categories
FOR SELECT
USING (is_admin_category = true);

-- Users can CRUD their own personal categories (non-admin created)
CREATE POLICY "Users can CRUD own non-admin task_categories"
ON public.task_categories
FOR ALL
USING (auth.uid() = user_id AND is_admin_category = false)
WITH CHECK (auth.uid() = user_id AND is_admin_category = false);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_device_categories_updated_at
BEFORE UPDATE ON public.device_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_device_inventory_updated_at
BEFORE UPDATE ON public.device_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_device_service_history_updated_at
BEFORE UPDATE ON public.device_service_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();