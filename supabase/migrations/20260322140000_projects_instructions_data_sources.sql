-- Single project-level field documenting where instruction content is sourced from
-- (e.g. manufacturer docs, building codes, internal playbooks).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS instructions_data_sources text;

COMMENT ON COLUMN public.projects.instructions_data_sources IS
  'References for project instruction content: sources such as manuals, codes, training materials, or SME notes.';
