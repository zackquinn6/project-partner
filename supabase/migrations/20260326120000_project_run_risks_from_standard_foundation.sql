-- Track whether a project_run_risk row originated from Standard Project Foundation vs the project template.
alter table public.project_run_risks
  add column if not exists from_standard_foundation boolean not null default false;

comment on column public.project_run_risks.from_standard_foundation is
  'True when this run risk was copied from project_risks on the is_standard=true foundation project; false for template-specific or user-added run risks.';

-- Backfill existing rows: template_risk_id points at project_risks.id; foundation risks belong to the standard project.
update public.project_run_risks prr
set from_standard_foundation = true
from public.project_risks pr
inner join public.projects p on p.id = pr.project_id and p.is_standard = true
where prr.template_risk_id = pr.id;
