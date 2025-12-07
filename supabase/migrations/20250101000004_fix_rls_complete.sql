DROP POLICY IF EXISTS "Only admins can update user roles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile role" ON profiles;

DROP FUNCTION IF EXISTS check_is_admin(uuid);

CREATE OR REPLACE FUNCTION check_is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_role, '') = 'admin';
END;
$$;

CREATE POLICY "Admins can update any profile role"
  ON profiles FOR UPDATE
  TO authenticated
  USING (check_is_admin(auth.uid()))
  WITH CHECK (check_is_admin(auth.uid()));

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (check_is_admin(auth.uid()));

