-- Allow any tutor to manage results (not just rows where tutor_id matches),
-- so corrections and re-entries flow through approval again.
DROP POLICY IF EXISTS "Tutors can manage results for their courses" ON public.results;

CREATE POLICY "Tutors can manage results"
ON public.results
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'tutor'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'tutor'::public.app_role));

-- Clean up NABUSOBA IMRAN's stray 0-mark duplicate enrollments (he was transferred).
-- Delete the 0-mark results first, then the duplicate enrollments that have no remaining results.
DELETE FROM public.results r
USING public.student_courses sc
WHERE r.student_course_id = sc.id
  AND sc.student_id = 'dd0787cc-11cd-40a0-9b16-bb00fd6aa466'
  AND COALESCE(r.total_marks, 0) = 0;

DELETE FROM public.student_courses sc
WHERE sc.student_id = 'dd0787cc-11cd-40a0-9b16-bb00fd6aa466'
  AND NOT EXISTS (SELECT 1 FROM public.results r WHERE r.student_course_id = sc.id);