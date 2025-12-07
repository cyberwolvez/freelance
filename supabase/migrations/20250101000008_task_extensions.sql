-- TASKS EXTENSIONS
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS column_values jsonb DEFAULT '{}'::jsonb;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ALTER COLUMN status TYPE text;

-- BOARDS EXTENSIONS
ALTER TABLE boards ADD COLUMN IF NOT EXISTS view_mode text DEFAULT 'table' CHECK (view_mode IN ('table', 'kanban'));

-- BOARD COLUMNS TABLE
CREATE TABLE IF NOT EXISTS board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('status', 'text', 'date', 'tags', 'people')),
  position integer DEFAULT 0,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- TASK ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON board_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_position ON board_columns(board_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- RLS
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- POLICIES: BOARD COLUMNS
-- Drop existing policy if it exists (handles case where migration was partially run)
DROP POLICY IF EXISTS "Users can read columns from own boards" ON board_columns;

CREATE POLICY "Users can read columns from own boards"
  ON board_columns FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_columns.board_id
      AND boards.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert columns in own boards" ON board_columns;
CREATE POLICY "Users can insert columns in own boards"
  ON board_columns FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_columns.board_id
      AND boards.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update columns in own boards" ON board_columns;
CREATE POLICY "Users can update columns in own boards"
  ON board_columns FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_columns.board_id
      AND boards.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete columns in own boards" ON board_columns;
CREATE POLICY "Users can delete columns in own boards"
  ON board_columns FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_columns.board_id
      AND boards.user_id = auth.uid()
    )
  );

-- POLICIES: TASK ATTACHMENTS
DROP POLICY IF EXISTS "Users can read attachments from own tasks" ON task_attachments;
CREATE POLICY "Users can read attachments from own tasks"
  ON task_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN boards ON boards.id = tasks.board_id
      WHERE tasks.id = task_attachments.task_id
      AND boards.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert attachments in own tasks" ON task_attachments;
CREATE POLICY "Users can insert attachments in own tasks"
  ON task_attachments FOR INSERT TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM tasks
        JOIN boards ON boards.id = tasks.board_id
        WHERE tasks.id = task_attachments.task_id
        AND boards.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM tasks
        WHERE tasks.id = task_attachments.task_id
        AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
      )
    )
    AND uploaded_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can delete attachments from own tasks" ON task_attachments;
CREATE POLICY "Users can delete attachments from own tasks"
  ON task_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN boards ON boards.id = tasks.board_id
      WHERE tasks.id = task_attachments.task_id
      AND boards.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

-- TRIGGER
CREATE TRIGGER handle_board_columns_updated_at
  BEFORE UPDATE ON board_columns
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- ADMIN POLICIES
DROP POLICY IF EXISTS "Admins can read all board columns" ON board_columns;
CREATE POLICY "Admins can read all board columns"
  ON board_columns FOR SELECT
  TO authenticated
  USING (check_is_admin() OR
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = board_columns.board_id
      AND boards.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can read all task attachments" ON task_attachments;
CREATE POLICY "Admins can read all task attachments"
  ON task_attachments FOR SELECT
  TO authenticated
  USING (check_is_admin() OR
    EXISTS (
      SELECT 1 FROM tasks
      JOIN boards ON boards.id = tasks.board_id
      WHERE tasks.id = task_attachments.task_id
      AND boards.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_attachments.task_id
      AND (tasks.user_id = auth.uid() OR tasks.assigned_to = auth.uid())
    )
  );

