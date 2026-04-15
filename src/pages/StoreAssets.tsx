import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, FileText, Heart, Pill, ClipboardList, DollarSign, Loader2 } from 'lucide-react';

export default function StoreAssets() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'store' | 'minutes' | 'assets' | 'health'>('store');

  // Form states
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState('');
  const [assetValue, setAssetValue] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingType, setMeetingType] = useState('');
  const [minutes, setMinutes] = useState('');
  const [healthDate, setHealthDate] = useState(new Date().toISOString().split('T')[0]);
  const [pupilName, setPupilName] = useState('');
  const [recordType, setRecordType] = useState('');
  const [details, setDetails] = useState('');
  const [medication, setMedication] = useState('');

  const openDialog = (type: 'store' | 'minutes' | 'assets' | 'health') => {
    setDialogType(type);
    setShowDialog(true);
  };

  const resetForm = () => {
    setItemName(''); setQuantity(''); setUnitPrice(''); setCategory(''); setAssetValue('');
    setLocation(''); setCondition(''); setMeetingType(''); setMinutes(''); setPupilName('');
    setRecordType(''); setDetails(''); setMedication('');
  };

  const { data: storeItems = [] } = useQuery({
    queryKey: ['store-items'],
    queryFn: async () => { const { data } = await supabase.from('store_items').select('*').order('created_at', { ascending: false }); return data || []; },
  });
  const { data: assets = [] } = useQuery({
    queryKey: ['school-assets'],
    queryFn: async () => { const { data } = await supabase.from('school_assets').select('*').order('created_at', { ascending: false }); return data || []; },
  });
  const { data: meetingMinutes = [] } = useQuery({
    queryKey: ['meeting-minutes'],
    queryFn: async () => { const { data } = await supabase.from('meeting_minutes').select('*').order('meeting_date', { ascending: false }); return data || []; },
  });
  const { data: healthRecords = [] } = useQuery({
    queryKey: ['health-records'],
    queryFn: async () => { const { data } = await supabase.from('health_records').select('*').order('record_date', { ascending: false }); return data || []; },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (dialogType === 'store') {
        const { error } = await supabase.from('store_items').insert({ item_name: itemName, quantity: parseInt(quantity) || 0, unit_price: parseFloat(unitPrice) || 0, category: category || 'other', recorded_by: user?.id || '' });
        if (error) throw error;
      } else if (dialogType === 'minutes') {
        const { error } = await supabase.from('meeting_minutes').insert({ meeting_date: meetingDate, meeting_type: meetingType, minutes, recorded_by: user?.id || '' });
        if (error) throw error;
      } else if (dialogType === 'assets') {
        const { error } = await supabase.from('school_assets').insert({ asset_name: itemName, quantity: parseInt(quantity) || 1, asset_value: parseFloat(assetValue) || 0, location, condition: condition || 'good', recorded_by: user?.id || '' });
        if (error) throw error;
      } else if (dialogType === 'health') {
        const { error } = await supabase.from('health_records').insert({ record_date: healthDate, pupil_name: pupilName, record_type: recordType || 'incident', details, medication, recorded_by: user?.id || '' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-items'] });
      queryClient.invalidateQueries({ queryKey: ['school-assets'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-minutes'] });
      queryClient.invalidateQueries({ queryKey: ['health-records'] });
      toast({ title: 'Record saved' });
      setShowDialog(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Store, Minutes, Assets & Health</h1>
          <p className="text-muted-foreground">Manage school inventory, meeting minutes, assets, and health records</p>
        </div>

        <Tabs defaultValue="store" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="store" className="flex gap-2"><Package className="w-4 h-4" /><span className="hidden sm:inline">Store</span></TabsTrigger>
            <TabsTrigger value="minutes" className="flex gap-2"><FileText className="w-4 h-4" /><span className="hidden sm:inline">Minutes</span></TabsTrigger>
            <TabsTrigger value="assets" className="flex gap-2"><ClipboardList className="w-4 h-4" /><span className="hidden sm:inline">Assets</span></TabsTrigger>
            <TabsTrigger value="health" className="flex gap-2"><Heart className="w-4 h-4" /><span className="hidden sm:inline">Health</span></TabsTrigger>
          </TabsList>

          <TabsContent value="store" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Store / Inventory ({storeItems.length})</h2>
              <Button onClick={() => openDialog('store')}><Plus className="w-4 h-4 mr-2" />Add Item</Button>
            </div>
            {storeItems.length === 0 ? (
              <Card><CardContent className="pt-6"><div className="text-center py-12 text-muted-foreground"><Package className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No inventory items recorded</p></div></CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {storeItems.map((item: any) => (
                  <Card key={item.id}><CardContent className="pt-4"><div className="flex justify-between"><div><p className="font-semibold">{item.item_name}</p><p className="text-sm text-muted-foreground">Qty: {item.quantity} • UGX {item.unit_price?.toLocaleString()}</p></div><Badge variant="secondary">{item.category}</Badge></div></CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="minutes" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Meeting Minutes ({meetingMinutes.length})</h2>
              <Button onClick={() => openDialog('minutes')}><Plus className="w-4 h-4 mr-2" />Add Minutes</Button>
            </div>
            {meetingMinutes.length === 0 ? (
              <Card><CardContent className="pt-6"><div className="text-center py-12 text-muted-foreground"><FileText className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No meeting minutes recorded</p></div></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {meetingMinutes.map((m: any) => (
                  <Card key={m.id}><CardContent className="pt-4"><p className="font-semibold">{m.meeting_type}</p><p className="text-sm text-muted-foreground">{m.meeting_date}</p><p className="text-sm mt-2 line-clamp-3">{m.minutes}</p></CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assets" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">School Assets ({assets.length})</h2>
              <Button onClick={() => openDialog('assets')}><Plus className="w-4 h-4 mr-2" />Add Asset</Button>
            </div>
            {assets.length === 0 ? (
              <Card><CardContent className="pt-6"><div className="text-center py-12 text-muted-foreground"><ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No assets registered</p></div></CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {assets.map((a: any) => (
                  <Card key={a.id}><CardContent className="pt-4"><div className="flex justify-between"><div><p className="font-semibold">{a.asset_name}</p><p className="text-sm text-muted-foreground">Qty: {a.quantity} • UGX {a.asset_value?.toLocaleString()} • {a.location}</p></div><Badge variant="secondary">{a.condition}</Badge></div></CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="health" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Health & Drug Monitoring ({healthRecords.length})</h2>
              <Button onClick={() => openDialog('health')}><Plus className="w-4 h-4 mr-2" />Add Record</Button>
            </div>
            {healthRecords.length === 0 ? (
              <Card><CardContent className="pt-6"><div className="text-center py-8 text-muted-foreground"><p>No health records yet</p></div></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {healthRecords.map((h: any) => (
                  <Card key={h.id}><CardContent className="pt-4"><div className="flex justify-between"><div><p className="font-semibold">{h.pupil_name}</p><p className="text-sm text-muted-foreground">{h.record_date} • {h.medication || 'No medication'}</p><p className="text-sm mt-1">{h.details}</p></div><Badge variant="secondary">{h.record_type}</Badge></div></CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogType === 'store' && 'Add Store Item'}
                {dialogType === 'minutes' && 'Add Meeting Minutes'}
                {dialogType === 'assets' && 'Register Asset'}
                {dialogType === 'health' && 'Add Health Record'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {dialogType === 'store' && (
                <>
                  <div className="space-y-2"><Label>Item Name</Label><Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Chalk, Exercise Books" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Unit Price (UGX)</Label><Input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stationery">Stationery</SelectItem>
                        <SelectItem value="textbooks">Textbooks</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="food">Food Supplies</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {dialogType === 'minutes' && (
                <>
                  <div className="space-y-2"><Label>Meeting Date</Label><Input type="date" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Meeting Type</Label><Input value={meetingType} onChange={e => setMeetingType(e.target.value)} placeholder="e.g. Staff Meeting" /></div>
                  <div className="space-y-2"><Label>Minutes</Label><Textarea value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="Meeting proceedings..." rows={6} /></div>
                </>
              )}
              {dialogType === 'assets' && (
                <>
                  <div className="space-y-2"><Label>Asset Name</Label><Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Desktop Computer" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Value (UGX)</Label><Input type="number" value={assetValue} onChange={e => setAssetValue(e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Office, Classroom P1" /></div>
                  <div className="space-y-2"><Label>Condition</Label>
                    <Select value={condition} onValueChange={setCondition}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {dialogType === 'health' && (
                <>
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={healthDate} onChange={e => setHealthDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Pupil Name</Label><Input value={pupilName} onChange={e => setPupilName(e.target.value)} placeholder="Pupil name" /></div>
                  <div className="space-y-2"><Label>Type</Label>
                    <Select value={recordType} onValueChange={setRecordType}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medication">Medication Dispensed</SelectItem>
                        <SelectItem value="incident">Health Incident</SelectItem>
                        <SelectItem value="checkup">Health Checkup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Details</Label><Textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} /></div>
                  <div className="space-y-2"><Label>Drug / Medication</Label><Input value={medication} onChange={e => setMedication(e.target.value)} placeholder="e.g. Paracetamol" /></div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
