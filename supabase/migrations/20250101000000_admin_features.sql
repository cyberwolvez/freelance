ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;

CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_type TEXT NOT NULL,
  target_id uuid NOT NULL,
  action TEXT NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_user_id ON admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all admin actions"
  ON admin_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert admin actions"
  ON admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    AND admin_user_id = auth.uid()
  );

CREATE POLICY "Only admins can update user roles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    CASE
      WHEN role = OLD.role THEN auth.uid() = id
      ELSE EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    END
  )
  WITH CHECK (
    CASE
      WHEN role = OLD.role THEN auth.uid() = id
      ELSE EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    END
  );

CREATE OR REPLACE FUNCTION change_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  admin_role text;
  old_role text;
  result jsonb;
BEGIN
  admin_user_id := auth.uid();
  
  IF admin_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  SELECT role INTO admin_role
  FROM profiles
  WHERE id = admin_user_id;
  
  IF admin_role != 'admin' THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Admin access required');
  END IF;
  
  SELECT role INTO old_role
  FROM profiles
  WHERE id = target_user_id;
  
  IF old_role IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  IF new_role NOT IN ('user', 'admin') THEN
    RETURN jsonb_build_object('error', 'Invalid role');
  END IF;
  
  UPDATE profiles
  SET role = new_role
  WHERE id = target_user_id;
  
  INSERT INTO admin_actions (admin_user_id, target_type, target_id, action, details)
  VALUES (
    admin_user_id,
    'user',
    target_user_id,
    'role_change',
    jsonb_build_object(
      'old_role', old_role,
      'new_role', new_role
    )
  );
  
  RETURN jsonb_build_object('success', true, 'old_role', old_role, 'new_role', new_role);
END;
$$;

CREATE OR REPLACE FUNCTION delete_user_account(
  target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  admin_role text;
  user_email text;
BEGIN
  admin_user_id := auth.uid();
  
  IF admin_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  SELECT role INTO admin_role
  FROM profiles
  WHERE id = admin_user_id;
  
  IF admin_role != 'admin' THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Admin access required');
  END IF;
  
  IF admin_user_id = target_user_id THEN
    RETURN jsonb_build_object('error', 'Cannot delete your own account');
  END IF;
  
  SELECT email INTO user_email
  FROM profiles
  WHERE id = target_user_id;
  
  DELETE FROM auth.users WHERE id = target_user_id;
  
  INSERT INTO admin_actions (admin_user_id, target_type, target_id, action, details)
  VALUES (
    admin_user_id,
    'user',
    target_user_id,
    'delete_user',
    jsonb_build_object('email', user_email)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION suspend_user(
  target_user_id uuid,
  is_suspended boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  admin_role text;
BEGIN
  admin_user_id := auth.uid();
  
  IF admin_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;
  
  SELECT role INTO admin_role
  FROM profiles
  WHERE id = admin_user_id;
  
  IF admin_role != 'admin' THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Admin access required');
  END IF;
  
  INSERT INTO admin_actions (admin_user_id, target_type, target_id, action, details)
  VALUES (
    admin_user_id,
    'user',
    target_user_id,
    CASE WHEN is_suspended THEN 'suspend_user' ELSE 'unsuspend_user' END,
    jsonb_build_object('suspended', is_suspended)
  );
  
  RETURN jsonb_build_object('success', true, 'suspended', is_suspended);
END;
$$;

