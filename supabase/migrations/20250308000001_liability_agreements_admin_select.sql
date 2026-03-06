-- Allow admins to read all liability (usage) agreements in the admin Agreements tab.
CREATE POLICY "Admins can read all liability agreements"
  ON public.liability_agreements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
