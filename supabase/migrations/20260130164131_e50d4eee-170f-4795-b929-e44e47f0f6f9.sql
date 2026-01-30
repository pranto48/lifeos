
-- Create loans table
CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lender_name TEXT NOT NULL,
    loan_type TEXT NOT NULL DEFAULT 'personal',
    principal_amount NUMERIC NOT NULL,
    interest_rate NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    remaining_amount NUMERIC NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    payment_frequency TEXT NOT NULL DEFAULT 'monthly',
    monthly_payment NUMERIC,
    next_payment_date DATE,
    reminder_days INTEGER DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loan payments table
CREATE TABLE public.loan_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP WITH TIME ZONE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for loans
CREATE POLICY "Users can CRUD own loans"
ON public.loans
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for loan_payments
CREATE POLICY "Users can CRUD own loan_payments"
ON public.loan_payments
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_loans_user_id ON public.loans(user_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_loans_next_payment ON public.loans(next_payment_date);
CREATE INDEX idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX idx_loan_payments_payment_date ON public.loan_payments(payment_date);

-- Add updated_at trigger
CREATE TRIGGER update_loans_updated_at
    BEFORE UPDATE ON public.loans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loan_payments_updated_at
    BEFORE UPDATE ON public.loan_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
