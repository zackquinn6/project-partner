-- Create project_plans table for storing user project assessments
CREATE TABLE public.project_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  contingency_percent INTEGER NOT NULL DEFAULT 10,
  sales_tax_percent NUMERIC NOT NULL DEFAULT 0,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.project_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own project plans" 
ON public.project_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own project plans" 
ON public.project_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project plans" 
ON public.project_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project plans" 
ON public.project_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_project_plans_updated_at
BEFORE UPDATE ON public.project_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();