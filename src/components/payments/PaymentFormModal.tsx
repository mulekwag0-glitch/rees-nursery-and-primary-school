import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notifyPaymentRecorded } from '@/lib/notifications';

interface PaymentFormModalProps {
  onSuccess?: () => void;
}

export function PaymentFormModal({ onSuccess }: PaymentFormModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const [studentId, setStudentId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  // Fetch students
  const { data: students } = useQuery({
    queryKey: ['students-for-payment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          user_id,
          profiles:user_id (full_name)
        `)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
  });

  // Fetch semesters
  const { data: semesters } = useQuery({
    queryKey: ['semesters-for-payment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP${year}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !semesterId || !amount || !user) return;

    setLoading(true);
    const receiptNumber = generateReceiptNumber();

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          student_id: studentId,
          semester_id: semesterId,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          receipt_number: receiptNumber,
          recorded_by: user.id,
          notes: notes || null,
        })
        .select(`
          *,
          students:student_id (
            student_id,
            profiles:user_id (full_name)
          ),
          semesters:semester_id (name)
        `)
        .single();

      if (error) throw error;

      setReceiptData(data);
      setShowReceipt(true);

      // Send notification to student
      const { data: studentRecord } = await supabase.from('students').select('user_id').eq('id', studentId).single();
      if (studentRecord?.user_id) {
        await notifyPaymentRecorded(studentRecord.user_id, parseFloat(amount), receiptNumber);
      }

      toast({
        title: 'Payment Recorded',
        description: `Receipt ${receiptNumber} generated successfully.`,
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${receiptData?.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .receipt-title { font-size: 20px; margin-top: 10px; }
            .receipt-info { margin: 20px 0; }
            .receipt-info p { margin: 8px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #16a34a; margin: 20px 0; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            .divider { border-top: 2px dashed #ccc; margin: 20px 0; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const resetForm = () => {
    setStudentId('');
    setSemesterId('');
    setAmount('');
    setPaymentMethod('cash');
    setNotes('');
    setShowReceipt(false);
    setReceiptData(null);
  };

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {!showReceipt ? (
          <>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Enter payment details for a student
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((student: any) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.student_id} - {student.profiles?.full_name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Semester</Label>
                <Select value={semesterId} onValueChange={setSemesterId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters?.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Payment'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Payment Receipt</DialogTitle>
              <DialogDescription>
                Payment recorded successfully
              </DialogDescription>
            </DialogHeader>
            <div id="receipt-content" className="mt-4 p-6 border rounded-lg bg-card">
              <div className="header text-center mb-6">
                <div className="logo text-2xl font-bold text-primary">Salem Uganda</div>
                <div className="text-sm text-muted-foreground">Institution Management System</div>
                <div className="receipt-title text-lg font-semibold mt-2">PAYMENT RECEIPT</div>
              </div>

              <div className="divider border-t-2 border-dashed border-border my-4" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt No:</span>
                  <span className="font-mono font-semibold">{receiptData?.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date(receiptData?.payment_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student ID:</span>
                  <span>{receiptData?.students?.student_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student Name:</span>
                  <span>{receiptData?.students?.profiles?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semester:</span>
                  <span>{receiptData?.semesters?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="capitalize">{receiptData?.payment_method?.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="divider border-t-2 border-dashed border-border my-4" />

              <div className="amount text-center">
                <div className="text-muted-foreground text-sm">Amount Paid</div>
                <div className="text-2xl font-bold text-success">
                  UGX {parseFloat(receiptData?.amount || 0).toLocaleString()}
                </div>
              </div>

              <div className="divider border-t-2 border-dashed border-border my-4" />

              <div className="footer text-center text-xs text-muted-foreground">
                <p>Thank you for your payment</p>
                <p>This is a computer-generated receipt</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button onClick={handlePrintReceipt} className="flex-1">
                <Printer className="w-4 h-4 mr-2" />
                Print Receipt
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}