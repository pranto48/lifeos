-- Ticket requester registration (device users who can submit tickets)
CREATE TABLE public.ticket_requesters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    phone text,
    support_user_id uuid REFERENCES public.support_users(id) ON DELETE SET NULL,
    device_id uuid REFERENCES public.device_inventory(id) ON DELETE SET NULL,
    email_verified boolean DEFAULT false,
    verification_token text,
    verification_expires_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Ticket categories (e.g., Hardware, Software, Network)
CREATE TABLE public.ticket_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    color text DEFAULT '#3b82f6',
    icon text DEFAULT 'Ticket',
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Custom form fields for ticket forms
CREATE TABLE public.ticket_form_fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid REFERENCES public.ticket_categories(id) ON DELETE CASCADE,
    field_name text NOT NULL,
    field_label text NOT NULL,
    field_type text NOT NULL DEFAULT 'text',
    field_options jsonb,
    is_required boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    placeholder text,
    default_value text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Support tickets
CREATE TABLE public.support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number text NOT NULL UNIQUE,
    requester_id uuid REFERENCES public.ticket_requesters(id) ON DELETE SET NULL,
    category_id uuid REFERENCES public.ticket_categories(id) ON DELETE SET NULL,
    device_id uuid REFERENCES public.device_inventory(id) ON DELETE SET NULL,
    assigned_to uuid,
    title text NOT NULL,
    description text NOT NULL,
    priority text NOT NULL DEFAULT 'medium',
    status text NOT NULL DEFAULT 'open',
    custom_fields jsonb,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Ticket comments/replies
CREATE TABLE public.ticket_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    author_type text NOT NULL DEFAULT 'staff',
    author_id uuid,
    content text NOT NULL,
    is_internal boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Ticket activity history
CREATE TABLE public.ticket_activity_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id uuid,
    action text NOT NULL,
    old_value text,
    new_value text,
    details jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ticket_requesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_requesters
CREATE POLICY "Anyone can register as requester" ON public.ticket_requesters FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all requesters" ON public.ticket_requesters FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_manager')
);
CREATE POLICY "Admins can update requesters" ON public.ticket_requesters FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_manager')
);
CREATE POLICY "Admins can delete requesters" ON public.ticket_requesters FOR DELETE USING (
    has_role(auth.uid(), 'admin')
);

-- RLS Policies for ticket_categories
CREATE POLICY "Anyone can view active categories" ON public.ticket_categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.ticket_categories FOR INSERT 
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_manager'));
CREATE POLICY "Admins can update categories" ON public.ticket_categories FOR UPDATE 
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_manager'));
CREATE POLICY "Admins can delete categories" ON public.ticket_categories FOR DELETE 
    USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for ticket_form_fields
CREATE POLICY "Anyone can view active form fields" ON public.ticket_form_fields FOR SELECT USING (true);
CREATE POLICY "Admins can insert form fields" ON public.ticket_form_fields FOR INSERT 
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_manager'));
CREATE POLICY "Admins can update form fields" ON public.ticket_form_fields FOR UPDATE 
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_manager'));
CREATE POLICY "Admins can delete form fields" ON public.ticket_form_fields FOR DELETE 
    USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for support_tickets
CREATE POLICY "Anyone can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can view all tickets" ON public.support_tickets FOR SELECT 
    USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can update tickets" ON public.support_tickets FOR UPDATE 
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support_manager') OR assigned_to = auth.uid());
CREATE POLICY "Admins can delete tickets" ON public.support_tickets FOR DELETE 
    USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for ticket_comments
CREATE POLICY "Anyone can add comments" ON public.ticket_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can view all comments" ON public.ticket_comments FOR SELECT 
    USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can update own comments" ON public.ticket_comments FOR UPDATE 
    USING (author_type = 'staff' AND author_id = auth.uid());
CREATE POLICY "Admins can delete comments" ON public.ticket_comments FOR DELETE 
    USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for ticket_activity_log
CREATE POLICY "Staff can view activity log" ON public.ticket_activity_log FOR SELECT 
    USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can insert activity log" ON public.ticket_activity_log FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_year text;
    current_month text;
    seq_num integer;
BEGIN
    current_year := to_char(now(), 'YY');
    current_month := to_char(now(), 'MM');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 6) AS integer)), 0) + 1
    INTO seq_num
    FROM public.support_tickets
    WHERE ticket_number LIKE 'TKT' || current_year || current_month || '%';
    
    NEW.ticket_number := 'TKT' || current_year || current_month || LPAD(seq_num::text, 4, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_number
    BEFORE INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_ticket_number();

-- Updated at triggers
CREATE TRIGGER update_ticket_requesters_updated_at
    BEFORE UPDATE ON public.ticket_requesters
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_categories_updated_at
    BEFORE UPDATE ON public.ticket_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_form_fields_updated_at
    BEFORE UPDATE ON public.ticket_form_fields
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_comments_updated_at
    BEFORE UPDATE ON public.ticket_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default ticket categories
INSERT INTO public.ticket_categories (name, description, color, icon, sort_order) VALUES
    ('Hardware', 'Hardware related issues', '#ef4444', 'HardDrive', 1),
    ('Software', 'Software and application issues', '#3b82f6', 'AppWindow', 2),
    ('Network', 'Network and connectivity issues', '#22c55e', 'Wifi', 3),
    ('Email', 'Email and communication issues', '#f97316', 'Mail', 4),
    ('Printer', 'Printer and printing issues', '#8b5cf6', 'Printer', 5),
    ('Account', 'Account and access issues', '#ec4899', 'UserCog', 6),
    ('Other', 'Other IT support requests', '#6b7280', 'HelpCircle', 7);

-- Insert default form fields (global fields, no category_id)
INSERT INTO public.ticket_form_fields (field_name, field_label, field_type, is_required, sort_order, placeholder) VALUES
    ('contact_phone', 'Contact Phone', 'text', false, 1, 'Your phone number'),
    ('urgency_reason', 'Urgency Reason', 'textarea', false, 2, 'If urgent, please explain why');

INSERT INTO public.ticket_form_fields (field_name, field_label, field_type, is_required, sort_order, field_options) VALUES
    ('preferred_contact', 'Preferred Contact Method', 'select', false, 3, '[{"label": "Email", "value": "email"}, {"label": "Phone", "value": "phone"}, {"label": "In Person", "value": "in_person"}]');