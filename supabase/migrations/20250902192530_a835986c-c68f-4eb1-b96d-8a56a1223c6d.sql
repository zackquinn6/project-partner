-- Add owned_materials field to profiles table for user material libraries
ALTER TABLE public.profiles 
ADD COLUMN owned_materials jsonb DEFAULT '[]'::jsonb;