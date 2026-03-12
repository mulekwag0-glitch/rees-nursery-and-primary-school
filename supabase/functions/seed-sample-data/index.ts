import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const students = [
      { email: 'john.kato@hfi.ac.ug', full_name: 'John Kato', phone: '+256701000001' },
      { email: 'sarah.nambi@hfi.ac.ug', full_name: 'Sarah Nambi', phone: '+256701000002' },
      { email: 'peter.ouma@hfi.ac.ug', full_name: 'Peter Ouma', phone: '+256701000003' },
      { email: 'grace.achieng@hfi.ac.ug', full_name: 'Grace Achieng', phone: '+256701000004' },
    ];

    // Get programs
    const { data: programs } = await supabase.from('programs').select('id, code').order('code');
    if (!programs?.length) throw new Error('No programs found');

    // Get semester 1
    const { data: semesters } = await supabase.from('semesters').select('id, semester_number').eq('is_current', true);
    const sem1 = semesters?.[0];
    if (!sem1) throw new Error('No current semester found');

    // Create tutor
    const { data: tutorUser, error: tutorErr } = await supabase.auth.admin.createUser({
      email: 'tutor.musa@hfi.ac.ug', password: 'Tutor2026!', email_confirm: true,
      user_metadata: { full_name: 'Musa Byaruhanga' },
    });
    if (tutorErr && !tutorErr.message?.includes('already')) throw tutorErr;
    
    let tutorId = tutorUser?.user?.id;
    if (!tutorId) {
      const { data: existingUsers } = await supabase.from('profiles').select('id').eq('email', 'tutor.musa@hfi.ac.ug').single();
      tutorId = existingUsers?.id;
    }

    if (tutorId) {
      await supabase.from('profiles').upsert({ id: tutorId, email: 'tutor.musa@hfi.ac.ug', full_name: 'Musa Byaruhanga' });
      await supabase.from('user_roles').upsert({ user_id: tutorId, role: 'tutor' }, { onConflict: 'user_id,role' });
    }

    const createdStudents: any[] = [];
    const programAssignment = ['MVM', 'EI', 'TCD', 'MVM']; // assign students to programs

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: s.email, password: 'Student2026!', email_confirm: true,
        user_metadata: { full_name: s.full_name },
      });

      if (createErr && !createErr.message?.includes('already')) {
        console.error('User creation error:', createErr);
        continue;
      }

      let userId = newUser?.user?.id;
      if (!userId) {
        const { data: existing } = await supabase.from('profiles').select('id').eq('email', s.email).single();
        userId = existing?.id;
      }
      if (!userId) continue;

      await supabase.from('profiles').upsert({ id: userId, email: s.email, full_name: s.full_name, phone: s.phone });
      await supabase.from('user_roles').upsert({ user_id: userId, role: 'student' }, { onConflict: 'user_id,role' });

      const programCode = programAssignment[i];
      const program = programs.find(p => p.code === programCode);
      if (!program) continue;

      const studentId = `HFI/${new Date().getFullYear()}/${String(i + 1).padStart(3, '0')}`;

      // Check if student record already exists
      const { data: existingStudent } = await supabase.from('students').select('id').eq('user_id', userId).single();
      
      let studentRecordId: string;
      if (existingStudent) {
        studentRecordId = existingStudent.id;
      } else {
        const { data: studentRecord, error: studentErr } = await supabase.from('students').insert({
          user_id: userId, student_id: studentId, program_id: program.id, current_year: 1, status: 'active',
        }).select('id').single();
        if (studentErr) { console.error('Student insert error:', studentErr); continue; }
        studentRecordId = studentRecord.id;
      }

      createdStudents.push({ userId, studentRecordId, programId: program.id, programCode });
    }

    // Get all semester 1 courses for each program
    for (const student of createdStudents) {
      const { data: courses } = await supabase.from('courses').select('id, code')
        .eq('program_id', student.programId).eq('semester_number', 1);

      if (!courses?.length) continue;

      // Enroll in courses
      for (const course of courses) {
        const { data: existing } = await supabase.from('student_courses')
          .select('id').eq('student_id', student.studentRecordId).eq('course_id', course.id).eq('semester_id', sem1.id).single();
        
        if (existing) continue;
        
        const { data: enrollment, error: enrollErr } = await supabase.from('student_courses').insert({
          student_id: student.studentRecordId, course_id: course.id, semester_id: sem1.id,
        }).select('id').single();

        if (enrollErr) { console.error('Enrollment error:', enrollErr); continue; }

        // Create approved results with random marks
        const cwMarks = Math.floor(Math.random() * 20) + 20; // 20-40
        const examMarks = Math.floor(Math.random() * 30) + 30; // 30-60
        const totalMarks = cwMarks + examMarks;
        const { grade, gradePoint } = calculateGrade(totalMarks);

        await supabase.from('results').upsert({
          student_course_id: enrollment.id,
          coursework_marks: cwMarks,
          exam_marks: examMarks,
          total_marks: totalMarks,
          grade,
          grade_point: gradePoint,
          status: 'approved',
          tutor_id: tutorId || null,
          approved_by: tutorId || null,
          approved_at: new Date().toISOString(),
        }, { onConflict: 'student_course_id' });
      }

      // Assign tutor to courses
      if (tutorId) {
        const { data: courses } = await supabase.from('courses').select('id')
          .eq('program_id', student.programId).eq('semester_number', 1);
        
        for (const course of courses || []) {
          await supabase.from('tutor_courses').upsert({
            tutor_id: tutorId, course_id: course.id, semester_id: sem1.id,
          }, { onConflict: 'id' }).select();
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, students_created: createdStudents.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateGrade(marks: number): { grade: string; gradePoint: number } {
  if (marks >= 70) return { grade: 'A', gradePoint: 5 };
  if (marks >= 60) return { grade: 'B', gradePoint: 4 };
  if (marks >= 50) return { grade: 'C', gradePoint: 3 };
  if (marks >= 45) return { grade: 'D', gradePoint: 2 };
  return { grade: 'F', gradePoint: 0 };
}
