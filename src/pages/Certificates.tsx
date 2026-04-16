import React, { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { FileText, Download, Search, Loader2, Award } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import reesLogo from '@/assets/rees-logo.png';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  status: string;
  enrollment_date: string;
  programs: { name: string; code: string };
}

export default function Certificates() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showCert, setShowCert] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['graduated-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`id, student_id, full_name, status, enrollment_date,
          programs(name, code)`)
        .order('student_id');
      if (error) throw error;
      if (error) throw error;
      return data as unknown as Student[];
    },
  });

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q);
  });

  const handleDownloadPDF = async () => {
    if (!certRef.current) return;
    try {
      toast({ title: 'Generating certificate...' });
      const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificate_${selectedStudent?.student_id || 'unknown'}.pdf`);
      toast({ title: 'Certificate downloaded!' });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Certificates</h1>
          <p className="text-muted-foreground">Generate completion certificates for graduating pupils</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search pupil by name or reg number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pupils</CardTitle>
            <CardDescription>Select a pupil to generate their completion certificate</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reg No</th>
                      <th>Name</th>
                      <th>Class</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(s => (
                      <tr key={s.id}>
                        <td className="font-mono text-sm">{s.student_id}</td>
                        <td className="font-medium">{s.full_name}</td>
                        <td><Badge variant="secondary">{s.programs?.name}</Badge></td>
                        <td><Badge variant={s.status === 'graduated' ? 'default' : 'secondary'}>{s.status}</Badge></td>
                        <td>
                          <Button size="sm" variant="outline" onClick={() => { setSelectedStudent(s); setShowCert(true); }}>
                            <Award className="w-4 h-4 mr-1" /> Certificate
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

        <Dialog open={showCert} onOpenChange={setShowCert}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Completion Certificate - {selectedStudent?.full_name}</DialogTitle>
            </DialogHeader>

            <div ref={certRef} className="bg-white text-black relative mx-auto" style={{ fontFamily: 'Georgia, serif', width: '1123px', height: '794px' }}>
              {/* Decorative borders */}
              <div className="absolute inset-0 border-[8px] border-red-800" />
              <div className="absolute inset-[10px] border-2 border-amber-600" />
              <div className="absolute inset-[14px] border border-red-300" />
              <div className="absolute inset-[18px] border border-amber-400/50" />

              {/* Corner ornaments */}
              {['top-6 left-6', 'top-6 right-6', 'bottom-6 left-6', 'bottom-6 right-6'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-8 h-8 border-2 border-amber-600 rounded-full opacity-30`} />
              ))}

              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-0">
                <img src={reesLogo} alt="" className="w-[350px] h-[350px] object-contain" />
              </div>

              <div className="relative z-10 text-center py-10 px-16 space-y-5">
                <img src={reesLogo} alt="Logo" className="w-24 h-24 mx-auto object-contain" />
                <div>
                  <h1 className="text-2xl font-bold text-red-800 tracking-wide uppercase">Rees Daycare Nursery & Primary School</h1>
                   <p className="text-sm text-gray-500 mt-1">Mbale City, Uganda | Tel: 0772379888/0706583860/0782063563</p>
                   <p className="text-sm text-gray-500">Email: reesnursery@gmail.com</p>
                   <p className="text-xs italic text-amber-700 mt-1">"With God We Can"</p>
                </div>

                <div className="py-4">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="h-[2px] w-20 bg-gradient-to-r from-transparent to-amber-600" />
                    <h2 className="text-3xl font-bold tracking-[0.4em] text-gray-800">CERTIFICATE</h2>
                    <div className="h-[2px] w-20 bg-gradient-to-l from-transparent to-amber-600" />
                  </div>
                  <p className="text-lg text-amber-700 tracking-widest uppercase">of Completion</p>
                </div>

                <div className="py-4 space-y-3">
                  <p className="text-gray-600 text-lg">This is to certify that</p>
                  <div className="inline-block">
                    <p className="text-3xl font-bold text-gray-900 px-10 pb-1">
                      {selectedStudent?.full_name}
                    </p>
                    <div className="h-[2px] bg-gradient-to-r from-transparent via-red-800 to-transparent" />
                  </div>
                  <p className="text-gray-600">Registration Number: <strong className="font-mono text-red-800">{selectedStudent?.student_id}</strong></p>
                  <p className="text-gray-600 text-lg">
                    has successfully completed the <strong className="text-red-800">{selectedStudent?.programs.name}</strong> programme
                  </p>
                  <p className="text-gray-600">
                    at <strong>Rees Daycare Nursery & Primary School</strong>
                  </p>
                </div>

                <div className="flex justify-between items-end pt-10 px-8">
                  <div className="text-center">
                    <p className="text-sm mb-2">{new Date().toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <div className="w-44 border-t-2 border-black pt-2 text-xs font-medium">Date</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <QRCodeSVG
                      value={`${window.location.origin}/verify?id=${selectedStudent?.student_id}&type=certificate`}
                      size={56}
                    />
                    <p className="text-[8px] text-gray-400 mt-1">Scan to verify</p>
                  </div>
                  <div className="text-center">
                    <div className="w-44 border-t-2 border-black pt-2 text-xs font-medium">Headmistress's Signature</div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCert(false)}>Close</Button>
              <Button onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
