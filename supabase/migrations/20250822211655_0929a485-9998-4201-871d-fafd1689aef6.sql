-- Add full_name and nickname columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN full_name TEXT,
ADD COLUMN nickname TEXT;