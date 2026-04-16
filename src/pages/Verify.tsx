import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import reesLogo from '@/assets/rees-logo.png';

const COMPETENCY_RATINGS: Record<string, string> = {
  BE: 'Beyond Expectation',
  AE: 'Above Expectation',
  ME: 'Meeting Expectation',
  BW: 'Below Expectation',
};

const getCompetencyFromScore = (score: number): string => {
  if (score >= 80) return 'BE';
  if (score >= 65) return 'AE';
  if (score >= 50) return 'ME';
  return 'BW';
};

export default function Verify() {
  const [searchParams] = useSearchParams();
  const studentRegNo = searchParams.get('id');
  const term = searchParams.get('term');
  const year = searchParams.get('year');

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!studentRegNo) { setLoading(false); return; }

    const verify = async () => {
      try {
        const { data: student } = await supabase
          .from('students')
          .select(`id, student_id, full_name, programs(name)`)
          .eq('student_id', studentRegNo)
          .maybeSingle();

        if (!student) { setLoading(false); return; }

        setVerified(true);
        setStudentName((student as any).full_name || 'Unknown');
        setClassName((student as any).programs?.name || 'Unknown');

        // Fetch results
        const { data: scData } = await supabase
          .from('student_courses')
          .select('id, courses(name), semesters(name)')
          .eq('student_id', student.id);

        if (scData?.length) {
          const filtered = term && term !== 'all'
            ? scData.filter((sc: any) => sc.semesters?.name === term)
            : scData;

          const scIds = filtered.map((sc: any) => sc.id);
          if (scIds.length > 0) {
            const { data: resultData } = await supabase
              .from('results')
              .select('total_marks, student_course_id, status')
              .in('student_course_id', scIds)
              .eq('status', 'approved');

            const mapped = (resultData || []).map((r: any) => {
              const sc = filtered.find((s: any) => s.id === r.student_course_id);
              return {
                subject: sc?.courses?.name || 'Unknown',
                total: r.total_marks || 0,
                competency: getCompetencyFromScore(r.total_marks || 0),
              };
            });
            setResults(mapped);
          }
        }
      } catch (e) {
        console.error('Verification error:', e);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [studentRegNo, term]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-3">
          <img src={reesLogo} alt="Rees Daycare Logo" className="w-16 h-16 mx-auto object-contain" />
          <CardTitle className="text-xl">
            Rees Daycare Nursery & Primary School
          </CardTitle>
          <p className="text-sm text-muted-foreground">Report Card Verification</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!studentRegNo ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
              <p className="font-semibold">Invalid verification link</p>
              <p className="text-sm text-muted-foreground">No student ID provided in the QR code.</p>
            </div>
          ) : !verified ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
              <p className="font-semibold">Verification Failed</p>
              <p className="text-sm text-muted-foreground">No student found with registration number: {studentRegNo}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Verified Authentic Report Card</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Pupil Name</p>
                  <p className="font-semibold">{studentName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reg. Number</p>
                  <p className="font-semibold font-mono">{studentRegNo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Class</p>
                  <p className="font-semibold">{className}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Term / Year</p>
                  <p className="font-semibold">{term || 'All'} {year || ''}</p>
                </div>
              </div>

              {results.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Results Summary</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 px-2">Subject</th>
                          <th className="text-center py-1.5 px-2">Total</th>
                          <th className="text-center py-1.5 px-2">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-1.5 px-2">{r.subject}</td>
                            <td className="text-center py-1.5 px-2 font-medium">{r.total}</td>
                            <td className="text-center py-1.5 px-2">
                              <Badge variant="secondary" className="text-xs">{r.competency}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    <strong>Key:</strong> BE = Beyond Expectation | AE = Above Expectation | ME = Meeting Expectation | BW = Below Expectation
                  </div>
                </div>
              )}
            </>
          )}

          <p className="text-center text-xs text-muted-foreground pt-4 border-t">
            Rees Daycare Nursery & Primary School, Mbale City | +256780306692
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
