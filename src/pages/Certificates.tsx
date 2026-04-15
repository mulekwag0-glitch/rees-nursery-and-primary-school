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
  user_id: string;
  status: string;
  enrollment_date: string;
  profiles: { full_name: string };
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
        .select(`id, student_id, user_id, status, enrollment_date,
          profiles!students_user_id_profiles_fkey(full_name),
          programs(name, code)`)
        .order('student_id');
      if (error) throw error;
      return data as unknown as Student[];
    },
  });

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.profiles?.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q);
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
                        <td className="font-medium">{s.profiles?.full_name}</td>
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
              <DialogTitle>Completion Certificate - {selectedStudent?.profiles.full_name}</DialogTitle>
            </DialogHeader>

            <div ref={certRef} className="bg-white text-black p-12 relative" style={{ fontFamily: 'serif', minHeight: '500px' }}>
              {/* Border */}
              <div className="absolute inset-4 border-4 border-double border-red-800 rounded-lg" />
              <div className="absolute inset-6 border border-red-300 rounded-lg" />

              <div className="relative z-10 text-center space-y-6 py-8">
                <img src={reesLogo} alt="Logo" className="w-20 h-20 mx-auto object-contain" />
                <div>
                  <h1 className="text-2xl font-bold text-red-800 tracking-wide">REES DAYCARE NURSERY & PRIMARY SCHOOL</h1>
                  <p className="text-sm text-gray-500">Mbale City, Uganda | +256780306692</p>
                </div>

                <h2 className="text-3xl font-bold tracking-[0.3em] text-gray-800 pt-4">CERTIFICATE</h2>
                <p className="text-lg text-gray-600">OF COMPLETION</p>

                <div className="py-6 space-y-2">
                  <p className="text-gray-600">This is to certify that</p>
                  <p className="text-2xl font-bold text-gray-900 border-b-2 border-red-800 inline-block px-8 pb-1">
                    {selectedStudent?.profiles.full_name}
                  </p>
                  <p className="text-gray-600 pt-2">Registration Number: <strong>{selectedStudent?.student_id}</strong></p>
                  <p className="text-gray-600">
                    has successfully completed the <strong>{selectedStudent?.programs.name}</strong> programme
                  </p>
                  <p className="text-gray-600">
                    at Rees Daycare Nursery & Primary School
                  </p>
                </div>

                <div className="flex justify-between items-end pt-8 px-12">
                  <div className="text-center">
                    <div className="w-40 border-t border-black pt-1 text-xs">Date</div>
                    <p className="text-sm mt-1">{new Date().toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <QRCodeSVG
                    value={`${window.location.origin}/verify?id=${selectedStudent?.student_id}&type=certificate`}
                    size={60}
                  />
                  <div className="text-center">
                    <div className="w-40 border-t border-black pt-1 text-xs">Head Teacher's Signature</div>
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
