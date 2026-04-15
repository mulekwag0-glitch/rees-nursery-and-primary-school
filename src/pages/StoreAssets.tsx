import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, FileText, Heart, Pill, ClipboardList, DollarSign } from 'lucide-react';

export default function StoreAssets() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState<'store' | 'minutes' | 'assets' | 'health'>('store');

  const openDialog = (type: 'store' | 'minutes' | 'assets' | 'health') => {
    setDialogType(type);
    setShowDialog(true);
  };

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
              <h2 className="text-lg font-semibold">Store / Inventory</h2>
              <Button onClick={() => openDialog('store')}><Plus className="w-4 h-4 mr-2" />Add Item</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No inventory items recorded</p>
                  <p className="text-sm">Track school supplies, textbooks, and materials</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="minutes" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Meeting Minutes</h2>
              <Button onClick={() => openDialog('minutes')}><Plus className="w-4 h-4 mr-2" />Add Minutes</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No meeting minutes recorded</p>
                  <p className="text-sm">Record staff meetings, board meetings, etc.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">School Assets</h2>
              <Button onClick={() => openDialog('assets')}><Plus className="w-4 h-4 mr-2" />Add Asset</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No assets registered</p>
                  <p className="text-sm">Register furniture, equipment, and property</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Health & Drug Monitoring</h2>
              <Button onClick={() => openDialog('health')}><Plus className="w-4 h-4 mr-2" />Add Record</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <Pill className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold">Drug Usage</p>
                  <p className="text-sm text-muted-foreground">Track medication dispensed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-destructive" />
                  <p className="font-semibold">Health Records</p>
                  <p className="text-sm text-muted-foreground">Pupil health incidents</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-semibold">Health Budget</p>
                  <p className="text-sm text-muted-foreground">Medical supplies budget</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <p>No health records yet</p>
                </div>
              </CardContent>
            </Card>
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
                  <div className="space-y-2"><Label>Item Name</Label><Input placeholder="e.g. Chalk, Exercise Books" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quantity</Label><Input type="number" placeholder="0" /></div>
                    <div className="space-y-2"><Label>Unit Price (UGX)</Label><Input type="number" placeholder="0" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                  <div className="space-y-2"><Label>Meeting Date</Label><Input type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
                  <div className="space-y-2"><Label>Meeting Type</Label><Input placeholder="e.g. Staff Meeting, Board Meeting" /></div>
                  <div className="space-y-2"><Label>Minutes</Label><Textarea placeholder="Meeting proceedings..." rows={6} /></div>
                </>
              )}
              {dialogType === 'assets' && (
                <>
                  <div className="space-y-2"><Label>Asset Name</Label><Input placeholder="e.g. Desktop Computer" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Quantity</Label><Input type="number" placeholder="1" /></div>
                    <div className="space-y-2"><Label>Value (UGX)</Label><Input type="number" placeholder="0" /></div>
                  </div>
                  <div className="space-y-2"><Label>Location</Label><Input placeholder="e.g. Office, Classroom P1" /></div>
                  <div className="space-y-2"><Label>Condition</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                  <div className="space-y-2"><Label>Date</Label><Input type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
                  <div className="space-y-2"><Label>Pupil Name</Label><Input placeholder="Pupil name" /></div>
                  <div className="space-y-2"><Label>Type</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medication">Medication Dispensed</SelectItem>
                        <SelectItem value="incident">Health Incident</SelectItem>
                        <SelectItem value="checkup">Health Checkup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Details</Label><Textarea placeholder="Description of health record..." rows={3} /></div>
                  <div className="space-y-2"><Label>Drug / Medication (if applicable)</Label><Input placeholder="e.g. Paracetamol, First Aid" /></div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => { toast({ title: 'Record saved' }); setShowDialog(false); }}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
