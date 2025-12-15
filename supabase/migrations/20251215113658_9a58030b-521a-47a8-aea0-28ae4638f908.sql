-- Fix search_path for calculate_grade function
CREATE OR REPLACE FUNCTION public.calculate_grade(marks DECIMAL)
RETURNS TABLE(grade TEXT, grade_point INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF marks >= 70 THEN
        RETURN QUERY SELECT 'A'::TEXT, 5;
    ELSIF marks >= 60 THEN
        RETURN QUERY SELECT 'B'::TEXT, 4;
    ELSIF marks >= 50 THEN
        RETURN QUERY SELECT 'C'::TEXT, 3;
    ELSIF marks >= 45 THEN
        RETURN QUERY SELECT 'D'::TEXT, 2;
    ELSE
        RETURN QUERY SELECT 'F'::TEXT, 0;
    END IF;
END;
$$;