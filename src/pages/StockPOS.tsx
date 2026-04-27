import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Trash2, Edit, Search, ShoppingCart, Receipt, Loader2, Printer, ChevronsUpDown, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

const CATEGORIES = ['uniform','stockings','books','stationery','other'];

type CartLine = { item_id: string; name: string; unit_price: number; qty: number; available: number };

function printReceipt(sale: any) {
  const w = window.open('', '_blank');
  if (!w) return;
  const itemsHtml = (sale.items || []).map((i: any) =>
    `<div class="row"><span>${i.qty} × ${i.name}</span><span>UGX ${(i.unit_price*i.qty).toLocaleString()}</span></div>`
  ).join('');
  w.document.write(`
    <html><head><title>POS Receipt ${sale.receipt_number}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;max-width:380px;margin:0 auto}
      .header{text-align:center;margin-bottom:16px}
      .logo{font-size:18px;font-weight:bold;color:#1e3a5f}
      .sub{font-size:11px;color:#666}
      .title{font-size:14px;font-weight:600;margin-top:6px;letter-spacing:2px}
      .divider{border-top:2px dashed #ccc;margin:12px 0}
      .row{display:flex;justify-content:space-between;margin:5px 0;font-size:13px}
      .total{font-size:18px;font-weight:bold;text-align:center;color:#16a34a;margin:14px 0}
      .footer{text-align:center;font-size:10px;color:#999;margin-top:18px}
    </style></head><body>
      <div class="header">
        <div class="logo">Rees Daycare Nursery & Primary School</div>
        <div class="sub">Mbale City, Uganda</div>
        <div class="title">SALES RECEIPT</div>
      </div>
      <div class="divider"></div>
      <div class="row"><span>Receipt:</span><span>${sale.receipt_number}</span></div>
      <div class="row"><span>Date:</span><span>${new Date(sale.sale_date).toLocaleDateString()}</span></div>
      <div class="row"><span>Pupil:</span><span>${sale.pupil_name || '-'}</span></div>
      <div class="row"><span>Class:</span><span>${sale.pupil_class || '-'}</span></div>
      <div class="divider"></div>
      ${itemsHtml}
      <div class="divider"></div>
      <div class="total">TOTAL: UGX ${Number(sale.total_amount).toLocaleString()}</div>
      <div class="row"><span>Method:</span><span style="text-transform:capitalize">${sale.payment_method.replace('_',' ')}</span></div>
      <div class="footer">Thank you for your purchase</div>
    </body></html>
  `);
  w.document.close();
  w.print();
}

export default function StockPOS() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Stock state
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', category: 'uniform', quantity: 0, cost_price: 0, selling_price: 0, reorder_level: 5, notes: '' });

  // POS state
  const [cart, setCart] = useState<CartLine[]>([]);
  const [studentId, setStudentId] = useState('');
  const [pupilOpen, setPupilOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [posNotes, setPosNotes] = useState('');
  const [receiptSearch, setReceiptSearch] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['stock_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_items' as any).select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-pos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, full_name, programs:program_id (name)')
        .eq('status', 'active')
        .order('student_id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['stock_sales', receiptSearch],
    queryFn: async () => {
      let q = supabase
        .from('stock_sales' as any)
        .select('*, students:student_id (student_id, full_name, programs:program_id (name))')
        .order('created_at', { ascending: false })
        .limit(100);
      if (receiptSearch.trim()) {
        q = supabase
          .from('stock_sales' as any)
          .select('*, students:student_id (student_id, full_name, programs:program_id (name))')
          .ilike('receipt_number', `%${receiptSearch.trim()}%`)
          .order('created_at', { ascending: false })
          .limit(100);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const filteredItems = useMemo(() => (items as any[]).filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku||'').toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  const lowStockCount = (items as any[]).filter(i => Number(i.quantity) <= Number(i.reorder_level)).length;

  const selectedPupil = useMemo(
    () => (students as any[]).find(s => s.id === studentId),
    [students, studentId]
  );

  const resetItemForm = () => { setForm({ name: '', sku: '', category: 'uniform', quantity: 0, cost_price: 0, selling_price: 0, reorder_level: 5, notes: '' }); setEditing(null); setOpenItem(false); };
  const startEdit = (i: any) => { setEditing(i); setForm({ name: i.name, sku: i.sku || '', category: i.category, quantity: i.quantity, cost_price: Number(i.cost_price), selling_price: Number(i.selling_price), reorder_level: i.reorder_level, notes: i.notes || '' }); setOpenItem(true); };

  const saveItem = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!form.name) throw new Error('Name required');
      const payload: any = { ...form, created_by: user.id };
      if (editing) {
        const { error } = await supabase.from('stock_items' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stock_items' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      toast({ title: editing ? 'Item updated' : 'Item added' });
      resetItemForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stock_items' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock_items'] }); toast({ title: 'Item removed' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(l => l.item_id === item.id);
      if (existing) {
        if (existing.qty + 1 > item.quantity) {
          toast({ title: 'Not enough stock', description: `Only ${item.quantity} of ${item.name} available`, variant: 'destructive' });
          return prev;
        }
        return prev.map(l => l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l);
      }
      if (item.quantity < 1) {
        toast({ title: 'Out of stock', description: item.name, variant: 'destructive' });
        return prev;
      }
      return [...prev, { item_id: item.id, name: item.name, unit_price: Number(item.selling_price), qty: 1, available: item.quantity }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    setCart(prev => prev.map(l => l.item_id === id ? { ...l, qty: Math.max(1, Math.min(qty, l.available)) } : l));
  };
  const removeLine = (id: string) => setCart(prev => prev.filter(l => l.item_id !== id));
  const cartTotal = cart.reduce((s, l) => s + l.unit_price * l.qty, 0);

  const recordSale = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not signed in');
      if (!studentId) throw new Error('Select a pupil');
      if (cart.length === 0) throw new Error('Cart is empty');
      const itemsPayload = cart.map(l => ({ item_id: l.item_id, name: l.name, unit_price: l.unit_price, qty: l.qty }));

      // Atomic: validates stock, decrements, generates receipt server-side
      const { data, error } = await supabase.rpc('create_stock_sale' as any, {
        _student_id: studentId,
        _items: itemsPayload,
        _payment_method: paymentMethod,
        _notes: posNotes || null,
      });
      if (error) throw error;

      const sale: any = data;
      await logAudit('stock_sale', 'stock_sales', sale.id, null, { total: sale.total_amount, items: itemsPayload.length });

      printReceipt({
        ...sale,
        pupil_name: selectedPupil?.full_name || selectedPupil?.student_id,
        pupil_class: (selectedPupil as any)?.programs?.name,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_items'] });
      qc.invalidateQueries({ queryKey: ['stock_sales'] });
      toast({ title: 'Sale recorded' });
      setCart([]); setStudentId(''); setPosNotes('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock & Point of Sale</h1>
          <p className="text-muted-foreground">Manage uniforms, stockings and other items; sell directly to pupils</p>
        </div>

        {lowStockCount > 0 && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="pt-4 flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="text-sm">{lowStockCount} item(s) at or below reorder level</span>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pos">
          <TabsList>
            <TabsTrigger value="pos" className="gap-2"><ShoppingCart className="w-4 h-4" />Point of Sale</TabsTrigger>
            <TabsTrigger value="stock" className="gap-2"><Package className="w-4 h-4" />Stock Items</TabsTrigger>
            <TabsTrigger value="sales" className="gap-2"><Receipt className="w-4 h-4" />Sales History</TabsTrigger>
          </TabsList>

          {/* POS TAB */}
          <TabsContent value="pos" className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Available Items</CardTitle>
                <CardDescription>Tap to add to cart</CardDescription>
              </CardHeader>
              <CardContent>
                <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="mb-4" />
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : filteredItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No items in stock yet. Add some on the Stock tab.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {filteredItems.map((i: any) => (
                      <button key={i.id} onClick={() => addToCart(i)}
                        disabled={i.quantity < 1}
                        className={cn(
                          "text-left p-3 rounded-lg border transition-all hover:shadow-md hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                          i.quantity <= i.reorder_level ? "border-warning/50" : ""
                        )}>
                        <div className="font-medium text-sm">{i.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{i.category}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-semibold text-primary">UGX {Number(i.selling_price).toLocaleString()}</span>
                          <Badge variant={i.quantity <= i.reorder_level ? 'destructive' : 'secondary'} className="text-xs">
                            {i.quantity} left
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Cart</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Pupil</Label>
                  <Popover open={pupilOpen} onOpenChange={setPupilOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" className="w-full justify-between font-normal mt-1">
                        {selectedPupil ? (
                          <span className="truncate text-left text-sm">
                            <span className="font-medium">{selectedPupil.full_name || selectedPupil.student_id}</span>
                            <span className="text-muted-foreground text-xs ml-2">{selectedPupil.student_id}</span>
                          </span>
                        ) : <span className="text-muted-foreground text-sm">Search pupil...</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover" align="start">
                      <Command>
                        <CommandInput placeholder="Type name or reg no..." />
                        <CommandList>
                          <CommandEmpty>No pupil found.</CommandEmpty>
                          <CommandGroup>
                            {(students as any[]).map(s => (
                              <CommandItem key={s.id} value={`${s.full_name || ''} ${s.student_id}`} onSelect={() => { setStudentId(s.id); setPupilOpen(false); }}>
                                <Check className={cn('mr-2 h-4 w-4', studentId === s.id ? 'opacity-100' : 'opacity-0')} />
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">{s.full_name || s.student_id}</span>
                                  <span className="text-xs text-muted-foreground">{s.student_id} · {s.programs?.name || ''}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Cart is empty</p>
                  ) : cart.map(l => (
                    <div key={l.item_id} className="flex items-center gap-2 p-2 rounded border">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{l.name}</div>
                        <div className="text-xs text-muted-foreground">UGX {l.unit_price.toLocaleString()}</div>
                      </div>
                      <Input type="number" min={1} max={l.available} value={l.qty} onChange={e => updateQty(l.item_id, Number(e.target.value))} className="w-16 h-8" />
                      <Button size="sm" variant="ghost" onClick={() => removeLine(l.item_id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">UGX {cartTotal.toLocaleString()}</span>
                  </div>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="add_to_account">Add to pupil account</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Notes (optional)" value={posNotes} onChange={e => setPosNotes(e.target.value)} />
                  <Button className="w-full" disabled={recordSale.isPending || cart.length === 0 || !studentId} onClick={() => recordSale.mutate()}>
                    {recordSale.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Complete Sale & Print
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STOCK TAB */}
          <TabsContent value="stock" className="mt-6 space-y-4">
            <Card>
              <CardContent className="pt-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
                </div>
                <Dialog open={openItem} onOpenChange={(o) => { if (!o) resetItemForm(); else setOpenItem(true); }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditing(null); setOpenItem(true); }}>
                      <Plus className="w-4 h-4 mr-2" />Add Stock Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editing ? 'Edit Item' : 'Add Stock Item'}</DialogTitle>
                      <DialogDescription>Used in the school store / POS</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); saveItem.mutate(); }} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label>Name *</Label>
                          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. School Uniform - Size M" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>SKU / Code</Label>
                          <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="UNI-M" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Category</Label>
                          <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Quantity</Label>
                          <Input type="number" min={0} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Reorder Level</Label>
                          <Input type="number" min={0} value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Cost Price (UGX)</Label>
                          <Input type="number" min={0} value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Selling Price (UGX)</Label>
                          <Input type="number" min={0} value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: Number(e.target.value) }))} />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label>Notes</Label>
                          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={resetItemForm}>Cancel</Button>
                        <Button type="submit" disabled={saveItem.isPending}>
                          {saveItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          {editing ? 'Save Changes' : 'Add Item'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : filteredItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No items yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead><tr><th>Name</th><th>SKU</th><th>Category</th><th>Qty</th><th>Cost</th><th>Selling</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                      <tbody>
                        {filteredItems.map((i: any) => (
                          <tr key={i.id}>
                            <td className="font-medium">{i.name}</td>
                            <td className="font-mono text-xs">{i.sku || '-'}</td>
                            <td className="capitalize text-sm">{i.category}</td>
                            <td className="font-semibold">{i.quantity}</td>
                            <td className="text-sm">UGX {Number(i.cost_price).toLocaleString()}</td>
                            <td className="text-sm">UGX {Number(i.selling_price).toLocaleString()}</td>
                            <td>
                              {i.quantity <= 0 ? <Badge variant="destructive">Out</Badge>
                                : i.quantity <= i.reorder_level ? <Badge className="bg-warning/20 text-warning border-0">Low</Badge>
                                : <Badge variant="secondary">OK</Badge>}
                            </td>
                            <td className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => startEdit(i)}><Edit className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Delete ${i.name}?`)) deleteItem.mutate(i.id); }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SALES TAB */}
          <TabsContent value="sales" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales History & Receipt Reprint</CardTitle>
                <CardDescription>{sales.length} transaction{sales.length === 1 ? '' : 's'} — search by receipt number to reprint</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search receipt number (e.g. POS-20260427-0001)"
                    value={receiptSearch}
                    onChange={e => setReceiptSearch(e.target.value)}
                    className="pl-10 font-mono"
                  />
                </div>
                {sales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {receiptSearch ? `No receipts match "${receiptSearch}"` : 'No sales yet'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Receipt</th><th>Pupil</th><th>Class</th><th>Items</th><th>Total</th><th>Method</th><th className="text-right">Action</th></tr></thead>
                      <tbody>
                        {(sales as any[]).map(s => (
                          <tr key={s.id}>
                            <td className="text-sm">{new Date(s.sale_date).toLocaleDateString()}</td>
                            <td className="font-mono text-xs">{s.receipt_number}</td>
                            <td className="font-medium">{s.students?.full_name || s.students?.student_id || '-'}</td>
                            <td className="text-sm">{s.students?.programs?.name || '-'}</td>
                            <td className="text-sm">{(s.items || []).length}</td>
                            <td className="font-semibold text-success">UGX {Number(s.total_amount).toLocaleString()}</td>
                            <td><Badge variant="secondary" className="capitalize text-xs">{(s.payment_method||'').replace('_',' ')}</Badge></td>
                            <td className="text-right">
                              <Button size="sm" variant="ghost" onClick={() => printReceipt({
                                ...s,
                                pupil_name: s.students?.full_name || s.students?.student_id,
                                pupil_class: s.students?.programs?.name,
                              })}>
                                <Printer className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}