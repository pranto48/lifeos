-- Create device_suppliers table
CREATE TABLE IF NOT EXISTS public.device_suppliers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add supplier_id to device_inventory (keep supplier_name for backward compatibility)
ALTER TABLE public.device_inventory ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.device_suppliers(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_device_suppliers_user_id ON public.device_suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_device_inventory_supplier_id ON public.device_inventory(supplier_id);

-- Enable RLS
ALTER TABLE public.device_suppliers ENABLE ROW LEVEL SECURITY;

-- RLS policies for device_suppliers
CREATE POLICY "Users can view all suppliers" ON public.device_suppliers
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert suppliers" ON public.device_suppliers
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'inventory_manager'))
    );

CREATE POLICY "Admins can update suppliers" ON public.device_suppliers
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'inventory_manager'))
    );

CREATE POLICY "Admins can delete suppliers" ON public.device_suppliers
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'inventory_manager'))
    );

-- Add updated_at trigger
CREATE TRIGGER update_device_suppliers_updated_at
    BEFORE UPDATE ON public.device_suppliers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();