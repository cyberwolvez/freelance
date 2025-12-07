-- Fix admin access to boards and tasks
-- This migration ensures admins can read all boards and tasks

-- First, ensure the check_is_admin function works correctly
CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS when checking admin status
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, '') = 'admin';
END;
$$;

-- Drop and recreate admin policies for boards to ensure they work
DROP POLICY IF EXISTS "Admins can read all boards" ON boards;
CREATE POLICY "Admins can read all boards"
  ON boards FOR SELECT
  TO authenticated
  USING (check_is_admin() OR auth.uid() = user_id);

-- Also ensure admins can update/delete boards
DROP POLICY IF EXISTS "Admins can update all boards" ON boards;
CREATE POLICY "Admins can update all boards"
  ON boards FOR UPDATE
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

DROP POLICY IF EXISTS "Admins can delete all boards" ON boards;
CREATE POLICY "Admins can delete all boards"
  ON boards FOR DELETE
  TO authenticated
  USING (check_is_admin());

-- Drop and recreate admin policies for tasks
DROP POLICY IF EXISTS "Admins can read all tasks" ON tasks;
CREATE POLICY "Admins can read all tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    check_is_admin() OR
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = tasks.board_id
      AND boards.user_id = auth.uid()
    ) OR
    tasks.user_id = auth.uid() OR
    tasks.assigned_to = auth.uid()
  );

-- Also ensure admins can update/delete tasks
DROP POLICY IF EXISTS "Admins can update all tasks" ON tasks;
CREATE POLICY "Admins can update all tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (check_is_admin())
  WITH CHECK (check_is_admin());

DROP POLICY IF EXISTS "Admins can delete all tasks" ON tasks;
CREATE POLICY "Admins can delete all tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (check_is_admin());

