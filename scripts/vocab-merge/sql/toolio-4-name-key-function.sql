-- Vocab merge export: Toolio's name normalization function (read-only).
-- Run in Toolio's SQL editor (Lovable). Save the single `payload` cell as toolio-4-name-key-function.json
-- (or the downloaded result as toolio-4-name-key-function.csv) in the export folder.
-- Project Partner gets an identical copy (public.vocab_name_key) so both apps normalize names the same way.
SELECT jsonb_build_object(
  'query', 'toolio-4-name-key-function',
  'version', 1,
  'exported_at', now(),
  'definition', pg_get_functiondef('public.inventory_item_name_comparison_key(text)'::regprocedure)
)::text AS payload;
