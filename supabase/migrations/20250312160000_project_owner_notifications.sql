-- Notifications for project owners: table, RPC, and triggers on project_runs (completion + issue reported).

-- 1. Notifications table (user-scoped)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications (mark read)"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger inserts run in the session of the user who updated project_runs; allow authenticated inserts so triggers can create notifications for project owners.
CREATE POLICY "Allow insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. Function: resolve template_id to parent project id
CREATE OR REPLACE FUNCTION notifications_resolve_parent_project_id(p_template_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT parent_project_id FROM projects WHERE id = p_template_id),
    p_template_id
  );
$$;

-- 3. Function: create one notification per project owner for a given run
CREATE OR REPLACE FUNCTION notifications_notify_project_owners(
  p_project_run_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
  v_parent_id uuid;
  v_run_name text;
  v_owner_record record;
BEGIN
  SELECT template_id, name INTO v_template_id, v_run_name
  FROM project_runs
  WHERE id = p_project_run_id;

  IF v_template_id IS NULL THEN
    RETURN;
  END IF;

  v_parent_id := notifications_resolve_parent_project_id(v_template_id);

  FOR v_owner_record IN
    SELECT DISTINCT po.user_id
    FROM project_owners po
    WHERE po.project_id = v_parent_id
       OR po.project_id = v_template_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, metadata)
    VALUES (
      v_owner_record.user_id,
      p_type,
      p_title,
      COALESCE(p_body, ''),
      p_metadata || jsonb_build_object('project_run_id', p_project_run_id, 'template_id', v_template_id, 'run_name', v_run_name)
    );
  END LOOP;
END;
$$;

-- 4. Trigger: project run completed
CREATE OR REPLACE FUNCTION notifications_on_project_run_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'complete' AND NEW.status = 'complete' THEN
    PERFORM notifications_notify_project_owners(
      NEW.id,
      'project_completed',
      'Project completed',
      'A user completed the project: ' || COALESCE(NEW.name, 'Untitled'),
      jsonb_build_object('project_run_id', NEW.id, 'template_id', NEW.template_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notifications_project_run_completed ON project_runs;
CREATE TRIGGER trigger_notifications_project_run_completed
  AFTER UPDATE ON project_runs
  FOR EACH ROW
  EXECUTE FUNCTION notifications_on_project_run_completed();

-- 5. Trigger: issue reported (issue_reports array grew). issue_reports may be stored as text or jsonb.
CREATE OR REPLACE FUNCTION notifications_on_issue_reported()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_len int;
  v_new_len int;
  v_run_name text;
BEGIN
  v_old_len := jsonb_array_length(COALESCE((OLD.issue_reports::text)::jsonb, '[]'::jsonb));
  v_new_len := jsonb_array_length(COALESCE((NEW.issue_reports::text)::jsonb, '[]'::jsonb));

  IF v_new_len > v_old_len THEN
    v_run_name := NEW.name;
    PERFORM notifications_notify_project_owners(
      NEW.id,
      'issue_reported',
      'Issue reported',
      'A user reported an issue on: ' || COALESCE(v_run_name, 'Untitled'),
      jsonb_build_object('project_run_id', NEW.id, 'template_id', NEW.template_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notifications_issue_reported ON project_runs;
CREATE TRIGGER trigger_notifications_issue_reported
  AFTER UPDATE ON project_runs
  FOR EACH ROW
  EXECUTE FUNCTION notifications_on_issue_reported();
