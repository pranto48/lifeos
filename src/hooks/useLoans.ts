import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Loan {
  id: string;
  user_id: string;
  lender_name: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  total_amount: number;
  remaining_amount: number;
  start_date: string;
  end_date: string | null;
  payment_frequency: string;
  monthly_payment: number | null;
  next_payment_date: string | null;
  reminder_days: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanPayment {
  id: string;
  user_id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  is_paid: boolean;
  paid_at: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanFormData {
  lender_name: string;
  loan_type: string;
  principal_amount: number;
  interest_rate: number;
  total_amount: number;
  start_date: string;
  end_date?: string;
  payment_frequency: string;
  monthly_payment?: number;
  next_payment_date?: string;
  reminder_days: number;
  notes?: string;
}

export interface PaymentFormData {
  loan_id: string;
  amount: number;
  payment_date: string;
  notes?: string;
}

export function useLoans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [loansRes, paymentsRes] = await Promise.all([
        supabase
          .from('loans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('loan_payments')
          .select('*')
          .eq('user_id', user.id)
          .order('payment_date', { ascending: true })
      ]);

      if (loansRes.error) throw loansRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      setLoans(loansRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (error: any) {
      console.error('Error loading loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const addLoan = async (data: LoanFormData) => {
    if (!user) return null;

    try {
      const { data: newLoan, error } = await supabase
        .from('loans')
        .insert({
          user_id: user.id,
          lender_name: data.lender_name,
          loan_type: data.loan_type,
          principal_amount: data.principal_amount,
          interest_rate: data.interest_rate || 0,
          total_amount: data.total_amount,
          remaining_amount: data.total_amount,
          start_date: data.start_date,
          end_date: data.end_date || null,
          payment_frequency: data.payment_frequency,
          monthly_payment: data.monthly_payment || null,
          next_payment_date: data.next_payment_date || null,
          reminder_days: data.reminder_days || 3,
          notes: data.notes || null,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setLoans(prev => [newLoan, ...prev]);
      toast.success('Loan added successfully');
      return newLoan;
    } catch (error: any) {
      console.error('Error adding loan:', error);
      toast.error('Failed to add loan');
      return null;
    }
  };

  const updateLoan = async (id: string, data: Partial<LoanFormData>) => {
    try {
      const { data: updated, error } = await supabase
        .from('loans')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setLoans(prev => prev.map(l => l.id === id ? updated : l));
      toast.success('Loan updated successfully');
      return updated;
    } catch (error: any) {
      console.error('Error updating loan:', error);
      toast.error('Failed to update loan');
      return null;
    }
  };

  const deleteLoan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLoans(prev => prev.filter(l => l.id !== id));
      setPayments(prev => prev.filter(p => p.loan_id !== id));
      toast.success('Loan deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting loan:', error);
      toast.error('Failed to delete loan');
      return false;
    }
  };

  const addPayment = async (data: PaymentFormData, createTransaction: boolean = true) => {
    if (!user) return null;

    try {
      let transactionId: string | null = null;

      // Find the loan to get the lender name for the transaction
      const loan = loans.find(l => l.id === data.loan_id);

      // Optionally create a transaction for this payment
      if (createTransaction) {
        const lenderName = loan?.lender_name || 'Loan';
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'expense',
            amount: data.amount,
            date: data.payment_date,
            merchant: `Loan Payment - ${lenderName}`,
            notes: data.notes || `Loan payment to ${lenderName}`,
            linked_entity_type: 'loan_payment',
            linked_entity_id: null // Will update after payment creation
          })
          .select()
          .single();

        if (txError) {
          console.error('Transaction creation error:', txError);
          throw txError;
        }
        transactionId = transaction.id;
      }

      const { data: payment, error } = await supabase
        .from('loan_payments')
        .insert({
          user_id: user.id,
          loan_id: data.loan_id,
          amount: data.amount,
          payment_date: data.payment_date,
          is_paid: true,
          paid_at: new Date().toISOString(),
          transaction_id: transactionId,
          notes: data.notes || null
        })
        .select()
        .single();

      if (error) throw error;

      // Update the linked entity id in transaction
      if (transactionId) {
        await supabase
          .from('transactions')
          .update({ linked_entity_id: payment.id })
          .eq('id', transactionId);
      }

      // Update remaining amount on loan
      if (loan) {
        const newRemaining = Math.max(0, loan.remaining_amount - data.amount);
        const newStatus = newRemaining === 0 ? 'paid_off' : 'active';
        
        await supabase
          .from('loans')
          .update({ 
            remaining_amount: newRemaining,
            status: newStatus
          })
          .eq('id', data.loan_id);

        setLoans(prev => prev.map(l => 
          l.id === data.loan_id 
            ? { ...l, remaining_amount: newRemaining, status: newStatus }
            : l
        ));
      }

      setPayments(prev => [...prev, payment]);
      toast.success('Payment recorded successfully');
      return payment;
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast.error('Failed to record payment');
      return null;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      const payment = payments.find(p => p.id === id);
      
      // Delete associated transaction if exists
      if (payment?.transaction_id) {
        await supabase
          .from('transactions')
          .delete()
          .eq('id', payment.transaction_id);
      }

      const { error } = await supabase
        .from('loan_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update remaining amount on loan
      if (payment) {
        const loan = loans.find(l => l.id === payment.loan_id);
        if (loan) {
          const newRemaining = loan.remaining_amount + payment.amount;
          await supabase
            .from('loans')
            .update({ 
              remaining_amount: newRemaining,
              status: 'active'
            })
            .eq('id', payment.loan_id);

          setLoans(prev => prev.map(l => 
            l.id === payment.loan_id 
              ? { ...l, remaining_amount: newRemaining, status: 'active' }
              : l
          ));
        }
      }

      setPayments(prev => prev.filter(p => p.id !== id));
      toast.success('Payment deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
      return false;
    }
  };

  const getUpcomingPayments = useCallback(() => {
    const today = new Date();
    const upcoming: { loan: Loan; daysUntil: number }[] = [];

    loans.forEach(loan => {
      if (loan.status === 'active' && loan.next_payment_date) {
        const paymentDate = new Date(loan.next_payment_date);
        const diffTime = paymentDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= 30) {
          upcoming.push({ loan, daysUntil: diffDays });
        }
      }
    });

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [loans]);

  const getLoanStats = useCallback(() => {
    const activeLoans = loans.filter(l => l.status === 'active');
    const totalDebt = activeLoans.reduce((sum, l) => sum + Number(l.remaining_amount), 0);
    const totalPrincipal = activeLoans.reduce((sum, l) => sum + Number(l.principal_amount), 0);
    const totalPaid = loans.reduce((sum, l) => sum + (Number(l.total_amount) - Number(l.remaining_amount)), 0);
    const monthlyPayments = activeLoans.reduce((sum, l) => sum + (Number(l.monthly_payment) || 0), 0);

    return {
      activeLoans: activeLoans.length,
      totalDebt,
      totalPrincipal,
      totalPaid,
      monthlyPayments,
      paidOffLoans: loans.filter(l => l.status === 'paid_off').length
    };
  }, [loans]);

  return {
    loans,
    payments,
    loading,
    addLoan,
    updateLoan,
    deleteLoan,
    addPayment,
    deletePayment,
    getUpcomingPayments,
    getLoanStats,
    refresh: loadLoans
  };
}
