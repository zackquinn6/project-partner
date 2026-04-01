DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agreement_templates'
      AND policyname = 'Allow insert agreement_templates'
  ) THEN
    RAISE EXCEPTION 'Missing policy "%" on public.agreement_templates', 'Allow insert agreement_templates';
  END IF;

  EXECUTE $sql$
    ALTER POLICY "Allow insert agreement_templates"
    ON public.agreement_templates
    WITH CHECK (public.is_admin(auth.uid()))
  $sql$;
END $$;
