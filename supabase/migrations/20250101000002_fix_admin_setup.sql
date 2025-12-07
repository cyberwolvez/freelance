DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'admin@gmail.com'
  ) THEN
    UPDATE profiles
    SET role = 'admin'
    WHERE email = 'admin@gmail.com';
    
    RAISE NOTICE 'Admin role set for admin@gmail.com';
  ELSE
    RAISE NOTICE 'User admin@gmail.com does not exist. Please sign up through the app first.';
  END IF;
END $$;

