-- Vocab link: triggers on the Toolio tables the phase 4 migration updates (read-only).
-- Run in Toolio's SQL editor (Lovable). Save the result as toolio-triggers.csv in the export folder.
SELECT c.relname AS table_name,
       t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid) AS definition,
       p.proname AS function_name,
       p.prosrc AS function_body
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname IN ('inventory_items', 'projects')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
