-- Add headmistress to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'headmistress';

-- Add parent_contact column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_contact text;

-- Add gender column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;