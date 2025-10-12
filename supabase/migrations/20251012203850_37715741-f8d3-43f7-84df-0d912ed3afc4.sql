-- Add missing foreign key relationship between home_risk_mitigations and home_risks
ALTER TABLE public.home_risk_mitigations 
ADD CONSTRAINT home_risk_mitigations_risk_id_fkey 
FOREIGN KEY (risk_id) 
REFERENCES public.home_risks(id) 
ON DELETE CASCADE;