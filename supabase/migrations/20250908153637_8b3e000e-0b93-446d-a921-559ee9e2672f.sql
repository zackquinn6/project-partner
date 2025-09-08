-- Add risk mitigation tracking to user homes
CREATE TABLE public.home_risk_mitigations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  home_id UUID NOT NULL,
  risk_id UUID NOT NULL,
  is_mitigated BOOLEAN NOT NULL DEFAULT false,
  mitigation_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.home_risk_mitigations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own risk mitigations" 
ON public.home_risk_mitigations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own risk mitigations" 
ON public.home_risk_mitigations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk mitigations" 
ON public.home_risk_mitigations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk mitigations" 
ON public.home_risk_mitigations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_home_risk_mitigations_updated_at
BEFORE UPDATE ON public.home_risk_mitigations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();