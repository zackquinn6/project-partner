-- ===========================================================================
-- Part 4: triggers, created after the load so the load emits no events.
-- ===========================================================================

-- tools / materials: key assignment, immutability, normalized name; TG_ARGV[0] is the entity.
CREATE OR REPLACE FUNCTION public.vocab_library_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.public_key IS NOT NULL AND NEW.public_key IS DISTINCT FROM OLD.public_key THEN
    RAISE EXCEPTION 'The key of % "%" cannot change', TG_ARGV[0], OLD.name;
  END IF;
  IF NEW.public_key IS NULL THEN
    NEW.public_key := public.vocab_new_key(TG_ARGV[0], NEW.name);
  END IF;
  NEW.name_key := public.vocab_name_key(NEW.name);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_library_after_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.vocab_emit(NEW.public_key, 'upsert');
  RETURN NULL;
END;
$$;

-- projects: only family roots carry a key; revisions never do. Categories must be vocabulary.
CREATE OR REPLACE FUNCTION public.vocab_projects_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unknown text[];
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.public_key IS NOT NULL AND NEW.parent_project_id IS NOT NULL THEN
    RAISE EXCEPTION 'Project family root "%" cannot become a revision', OLD.name;
  END IF;
  IF NEW.parent_project_id IS NOT NULL THEN
    NEW.public_key := NULL;
  ELSE
    IF TG_OP = 'UPDATE' AND OLD.public_key IS NOT NULL AND NEW.public_key IS DISTINCT FROM OLD.public_key THEN
      RAISE EXCEPTION 'The key of project "%" cannot change', OLD.name;
    END IF;
    IF NEW.public_key IS NULL THEN
      NEW.public_key := public.vocab_new_key('project', NEW.name);
    END IF;
  END IF;
  IF NEW.category IS NOT NULL THEN
    SELECT array_agg(c) INTO v_unknown
    FROM unnest(NEW.category) AS c
    WHERE NOT EXISTS (SELECT 1 FROM public.project_categories pc WHERE pc.name = c);
    IF v_unknown IS NOT NULL THEN
      RAISE EXCEPTION 'Not in the shared category list: %', array_to_string(v_unknown, ', ');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_projects_after_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root uuid := CASE WHEN NEW.parent_project_id IS NULL THEN NEW.id ELSE NEW.parent_project_id END;
  v_key text;
BEGIN
  SELECT public_key INTO v_key FROM public.projects WHERE id = v_root;
  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.publish_status = 'published' AND OLD.publish_status IS DISTINCT FROM 'published' THEN
    PERFORM public.vocab_rebuild_family_tools(v_root);
  ELSE
    PERFORM public.vocab_emit(v_key, 'upsert');
  END IF;
  RETURN NULL;
END;
$$;

-- project_categories: key assignment, immutability, renames carried into projects.category.
CREATE OR REPLACE FUNCTION public.vocab_categories_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.public_key IS DISTINCT FROM OLD.public_key THEN
    RAISE EXCEPTION 'The key of category "%" cannot change', OLD.name;
  END IF;
  IF NEW.public_key IS NULL THEN
    NEW.public_key := public.vocab_new_key('category', NEW.name);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_categories_after_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.projects SET category = array_replace(category, OLD.name, NEW.name) WHERE OLD.name = ANY (category);
  END IF;
  PERFORM public.vocab_emit(NEW.public_key, 'upsert');
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_aliases_after_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A removal in progress emits its own remove and replacement events.
  IF current_setting('vocab.completing_removal', true) = 'on' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'DELETE' THEN
    PERFORM public.vocab_emit(OLD.public_key, 'upsert');
  ELSE
    PERFORM public.vocab_emit(NEW.public_key, 'upsert');
  END IF;
  RETURN NULL;
END;
$$;

-- Shared terms are removed only by completing an approved two-sided removal request.
CREATE OR REPLACE FUNCTION public.vocab_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('vocab.completing_removal', true) = 'on' THEN
    RETURN OLD;
  END IF;
  IF OLD.public_key IS NULL THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Shared % "%" cannot be deleted directly. Use Request removal.', TG_ARGV[0], OLD.public_key;
END;
$$;

DROP TRIGGER IF EXISTS vocab_tools_before_write ON public.tools;
CREATE TRIGGER vocab_tools_before_write BEFORE INSERT OR UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.vocab_library_before_write('tool');
DROP TRIGGER IF EXISTS vocab_tools_after_write ON public.tools;
CREATE TRIGGER vocab_tools_after_write AFTER INSERT OR UPDATE OF name, category, description, public_key ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.vocab_library_after_write();
DROP TRIGGER IF EXISTS vocab_tools_delete_guard ON public.tools;
CREATE TRIGGER vocab_tools_delete_guard BEFORE DELETE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.vocab_delete_guard('tool');

DROP TRIGGER IF EXISTS vocab_materials_before_write ON public.materials;
CREATE TRIGGER vocab_materials_before_write BEFORE INSERT OR UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.vocab_library_before_write('material');
DROP TRIGGER IF EXISTS vocab_materials_after_write ON public.materials;
CREATE TRIGGER vocab_materials_after_write AFTER INSERT OR UPDATE OF name, category, description, public_key ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.vocab_library_after_write();
DROP TRIGGER IF EXISTS vocab_materials_delete_guard ON public.materials;
CREATE TRIGGER vocab_materials_delete_guard BEFORE DELETE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.vocab_delete_guard('material');

DROP TRIGGER IF EXISTS vocab_projects_before_write ON public.projects;
CREATE TRIGGER vocab_projects_before_write BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.vocab_projects_before_write();
DROP TRIGGER IF EXISTS vocab_projects_after_write ON public.projects;
CREATE TRIGGER vocab_projects_after_write
  AFTER INSERT OR UPDATE OF name, description, category, tags, publish_status, visibility_status ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.vocab_projects_after_write();
DROP TRIGGER IF EXISTS vocab_projects_delete_guard ON public.projects;
CREATE TRIGGER vocab_projects_delete_guard BEFORE DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.vocab_delete_guard('project');

DROP TRIGGER IF EXISTS vocab_categories_before_write ON public.project_categories;
CREATE TRIGGER vocab_categories_before_write BEFORE INSERT OR UPDATE ON public.project_categories
  FOR EACH ROW EXECUTE FUNCTION public.vocab_categories_before_write();
DROP TRIGGER IF EXISTS vocab_categories_after_write ON public.project_categories;
CREATE TRIGGER vocab_categories_after_write AFTER INSERT OR UPDATE ON public.project_categories
  FOR EACH ROW EXECUTE FUNCTION public.vocab_categories_after_write();
DROP TRIGGER IF EXISTS vocab_categories_delete_guard ON public.project_categories;
CREATE TRIGGER vocab_categories_delete_guard BEFORE DELETE ON public.project_categories
  FOR EACH ROW EXECUTE FUNCTION public.vocab_delete_guard('category');

DROP TRIGGER IF EXISTS vocab_aliases_after_write ON public.vocab_aliases;
CREATE TRIGGER vocab_aliases_after_write AFTER INSERT OR UPDATE OR DELETE ON public.vocab_aliases
  FOR EACH ROW EXECUTE FUNCTION public.vocab_aliases_after_write();
