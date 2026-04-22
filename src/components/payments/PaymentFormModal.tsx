import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, Printer, Search, Check, ChevronsUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { notifyPaymentRecorded } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';
import { paymentSchema, validateForm } from '@/lib/validation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface PaymentFormModalProps {
  onSuccess?: () => void;
}

export function PaymentFormModal({ onSuccess }: PaymentFormModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [pupilOpen, setPupilOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [studentId, setStudentId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const { data: students } = useQuery({
    queryKey: ['students-for-payment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`id, student_id, full_name, programs:program_id (name)`)
        .eq('status', 'active')
        .order('student_id');
      if (error) throw error;
      return data;
    },
  });

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

  const selectedPupil = useMemo(
    () => students?.find((s: any) => s.id === studentId),
    [students, studentId]
  );

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP${year}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const v = validateForm(paymentSchema, {
        studentId, semesterId, amount: parseFloat(amount) || 0, paymentMethod, notes,
      });

      setLoading(true);
      const receiptNumber = generateReceiptNumber();

      const { data, error } = await supabase
        .from('payments')
        .insert({
          student_id: v.studentId,
          semester_id: v.semesterId,
          amount: v.amount,
          payment_method: v.paymentMethod,
          receipt_number: receiptNumber,
          recorded_by: user.id,
          notes: v.notes || null,
        })
        .select(`*, students:student_id (student_id, full_name, programs:program_id (name), profiles:user_id (full_name)), semesters:semester_id (name)`)
        .single();

      if (error) throw error;

      // If a discount was entered, create a pending discount request
      const discountAmount = parseFloat(discount) || 0;
      if (discountAmount > 0) {
        const { error: dErr } = await supabase.from('pupil_discounts').insert({
          student_id: v.studentId,
          semester_id: v.semesterId,
          amount: discountAmount,
          reason: discountReason || null,
          status: 'pending',
          requested_by: user.id,
        });
        if (dErr) {
          toast({ title: 'Discount not requested', description: dErr.message, variant: 'destructive' });
        } else {
          toast({ title: 'Discount Requested', description: 'Awaiting admin/headmistress approval.' });
        }
      }

      setReceiptData(data);
      setShowReceipt(true);

      const { data: studentRecord } = await supabase.from('students').select('user_id').eq('id', v.studentId).single();
      if (studentRecord?.user_id) {
        await notifyPaymentRecorded(studentRecord.user_id, v.amount, receiptNumber);
      }

      await logAudit('payment_recorded', 'payments', data.id, null, { student_id: v.studentId, amount: v.amount, receipt_number: receiptNumber });

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
            .logo { font-size: 24px; font-weight: bold; color: #b91c1c; }
            .receipt-title { font-size: 20px; margin-top: 10px; }
            .amount { font-size: 24px; font-weight: bold; color: #16a34a; margin: 20px 0; text-align: center; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            .divider { border-top: 2px dashed #ccc; margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const resetForm = () => {
    setStudentId('');
    setSemesterId('');
    setAmount('');
    setDiscount('');
    setDiscountReason('');
    setPaymentMethod('cash');
    setNotes('');
    setShowReceipt(false);
    setReceiptData(null);
  };

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  const pupilDisplayName = (s: any) =>
    s.full_name || s.profiles?.full_name || s.student_id;

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {!showReceipt ? (
          <>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Search a pupil by name or registration number</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Pupil</Label>
                <Popover open={pupilOpen} onOpenChange={setPupilOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      {selectedPupil ? (
                        <span className="truncate text-left">
                          <span className="font-medium">{pupilDisplayName(selectedPupil)}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {selectedPupil.student_id} · {(selectedPupil as any).programs?.name || ''}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Search pupil by name or reg no...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
                    <Command>
                      <CommandInput placeholder="Type name or reg no..." />
                      <CommandList>
                        <CommandEmpty>No pupil found.</CommandEmpty>
                        <CommandGroup>
                          {students?.map((s: any) => {
                            const name = pupilDisplayName(s);
                            return (
                              <CommandItem
                                key={s.id}
                                value={`${name} ${s.student_id}`}
                                onSelect={() => { setStudentId(s.id); setPupilOpen(false); }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', studentId === s.id ? 'opacity-100' : 'opacity-0')} />
                                <div className="flex flex-col">
                                  <span className="font-medium">{name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {s.student_id} · {s.programs?.name || ''}
                                  </span>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={semesterId} onValueChange={setSemesterId} required>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    {semesters?.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>{semester.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" min="0" required />
              </div>

              <div className="space-y-2 p-3 rounded-lg border border-dashed">
                <Label className="text-sm">Discount (Optional — needs approval)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount UGX" min="0" />
                  <Input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Reason" />
                </div>
                <p className="text-xs text-muted-foreground">Discount will be saved as pending until approved by Admin/Headmistress.</p>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={loading || !studentId}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Payment'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Payment Receipt</DialogTitle>
              <DialogDescription>Payment recorded successfully</DialogDescription>
            </DialogHeader>
            <div id="receipt-content" className="mt-4 p-6 border rounded-lg bg-card">
              <div className="header text-center mb-6">
                <div className="logo text-2xl font-bold text-primary">Rees Daycare Nursery & Primary School</div>
                <div className="text-xs text-muted-foreground">Mbale City, Uganda · Tel: 0772379888 / 0706583860 / 0782063563</div>
                <div className="text-xs text-muted-foreground">Email: reesnursery@gmail.com</div>
                <div className="receipt-title text-lg font-semibold mt-2">PAYMENT RECEIPT</div>
              </div>
              <div className="divider border-t-2 border-dashed border-border my-4" />
              <div className="space-y-2 text-sm">
                <div className="row flex justify-between"><span className="text-muted-foreground">Receipt No:</span><span className="font-mono font-semibold">{receiptData?.receipt_number}</span></div>
                <div className="row flex justify-between"><span className="text-muted-foreground">Date:</span><span>{new Date(receiptData?.payment_date).toLocaleDateString()}</span></div>
                <div className="row flex justify-between"><span className="text-muted-foreground">Pupil ID:</span><span>{receiptData?.students?.student_id}</span></div>
                <div className="row flex justify-between"><span className="text-muted-foreground">Pupil Name:</span><span>{receiptData?.students?.full_name || receiptData?.students?.profiles?.full_name || '-'}</span></div>
                <div className="row flex justify-between"><span className="text-muted-foreground">Class:</span><span>{receiptData?.students?.programs?.name || '-'}</span></div>
                <div className="row flex justify-between"><span className="text-muted-foreground">Term:</span><span>{receiptData?.semesters?.name}</span></div>
                <div className="row flex justify-between"><span className="text-muted-foreground">Payment Method:</span><span className="capitalize">{receiptData?.payment_method?.replace('_', ' ')}</span></div>
              </div>
              <div className="divider border-t-2 border-dashed border-border my-4" />
              <div className="amount text-center">
                <div className="text-muted-foreground text-sm">Amount Paid</div>
                <div className="text-2xl font-bold text-success">UGX {parseFloat(receiptData?.amount || 0).toLocaleString()}</div>
              </div>
              <div className="divider border-t-2 border-dashed border-border my-4" />
              <div className="footer text-center text-xs text-muted-foreground">
                <p>Thank you for your payment</p>
                <p>This is a computer-generated receipt</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">Close</Button>
              <Button onClick={handlePrintReceipt} className="flex-1">
                <Printer className="w-4 h-4 mr-2" /> Print Receipt
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
