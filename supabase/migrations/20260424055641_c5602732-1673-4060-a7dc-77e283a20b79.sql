
-- Update calculate_grade to support level-based grading (P1-P3 vs P4-P7)
CREATE OR REPLACE FUNCTION public.calculate_grade(marks numeric, level text DEFAULT 'lower')
RETURNS TABLE(grade text, grade_point integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF level = 'upper' THEN
    -- Primary Four to Primary Seven (adjusted)
    IF marks >= 95 THEN RETURN QUERY SELECT 'D1'::TEXT, 1;
    ELSIF marks >= 80 THEN RETURN QUERY SELECT 'D2'::TEXT, 2;
    ELSIF marks >= 60 THEN RETURN QUERY SELECT 'C3'::TEXT, 3;
    ELSIF marks >= 55 THEN RETURN QUERY SELECT 'C4'::TEXT, 4;
    ELSIF marks >= 50 THEN RETURN QUERY SELECT 'C6'::TEXT, 6;
    ELSIF marks >= 45 THEN RETURN QUERY SELECT 'P7'::TEXT, 7;
    ELSIF marks >= 40 THEN RETURN QUERY SELECT 'P8'::TEXT, 8;
    ELSE RETURN QUERY SELECT 'F9'::TEXT, 9;
    END IF;
  ELSE
    -- Primary One to Primary Three (default)
    IF marks >= 90 THEN RETURN QUERY SELECT 'D1'::TEXT, 1;
    ELSIF marks >= 80 THEN RETURN QUERY SELECT 'D2'::TEXT, 2;
    ELSIF marks >= 60 THEN RETURN QUERY SELECT 'C3'::TEXT, 3;
    ELSIF marks >= 55 THEN RETURN QUERY SELECT 'C4'::TEXT, 4;
    ELSIF marks >= 50 THEN RETURN QUERY SELECT 'C6'::TEXT, 6;
    ELSIF marks >= 45 THEN RETURN QUERY SELECT 'P7'::TEXT, 7;
    ELSIF marks >= 40 THEN RETURN QUERY SELECT 'P8'::TEXT, 8;
    ELSE RETURN QUERY SELECT 'F9'::TEXT, 9;
    END IF;
  END IF;
END;
$function$;
