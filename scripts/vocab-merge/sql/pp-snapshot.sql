-- Vocab link: Project Partner vocabulary snapshot (read-only).
-- Run in Project Partner's Supabase SQL editor. Save the single payload cell as pp-snapshot.json
-- (or the downloaded result as pp-snapshot.csv) in the export folder.
-- Same content as the project-partner-vocab snapshot action, without the service-role check.
SELECT jsonb_build_object(
  'query', 'pp-snapshot',
  'version', 1,
  'exported_at', now(),
  'as_of_seq', (SELECT CASE WHEN max(seq) IS NULL THEN 0 ELSE max(seq) END FROM public.vocab_change_events),
  'terms', (SELECT jsonb_agg(public.vocab_term_payload(k.public_key) ORDER BY k.entity, k.public_key)
            FROM public.vocab_keys k WHERE k.removed_at IS NULL),
  'removal_requests', (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at)
                       FROM public.vocab_removal_requests r WHERE r.status = 'open')
)::text AS payload;
