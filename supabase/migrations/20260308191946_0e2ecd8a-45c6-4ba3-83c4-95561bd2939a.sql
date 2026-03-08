
-- Create storage bucket for student passport photos
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true);

-- Allow authenticated users to upload to student-photos bucket
CREATE POLICY "Admins can upload student photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-photos' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow anyone to view student photos (for transcript rendering)
CREATE POLICY "Anyone can view student photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'student-photos');

-- Allow admins to delete student photos
CREATE POLICY "Admins can delete student photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-photos' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to update student photos
CREATE POLICY "Admins can update student photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-photos' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
