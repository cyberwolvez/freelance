CREATE OR REPLACE FUNCTION check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, '') = 'admin';
END;
$$;

DROP POLICY IF EXISTS "Admins can read all boards" ON boards;
CREATE POLICY "Admins can read all boards"
  ON boards FOR SELECT
  TO authenticated
  USING (check_is_admin() OR auth.uid() = user_id);

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

