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

DROP POLICY IF EXISTS "Admins can read all time entries" ON time_entries;
CREATE POLICY "Admins can read all time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (check_is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all projects" ON projects;
CREATE POLICY "Admins can read all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (check_is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all clients" ON clients;
CREATE POLICY "Admins can read all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (check_is_admin() OR auth.uid() = user_id);

