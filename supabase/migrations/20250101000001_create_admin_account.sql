UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@timetracker.com';

INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Admin User'),
  'admin',
  created_at,
  updated_at
FROM auth.users
WHERE email = 'admin@timetracker.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

