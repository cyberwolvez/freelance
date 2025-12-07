-- ============================================
-- ADMIN ACCOUNT VERIFICATION SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor to check if your account is admin
-- Replace 'admin@gmail.com' with your actual email

-- Check if user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'admin@gmail.com';

-- Check if profile exists and role
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at,
  CASE 
    WHEN p.role = 'admin' THEN '✅ ADMIN'
    WHEN p.role = 'user' THEN '❌ USER (Not Admin)'
    ELSE '⚠️ UNKNOWN ROLE'
  END as status
FROM profiles p
WHERE p.email = 'admin@gmail.com';

-- Check all users and their roles
SELECT 
  p.email,
  p.full_name,
  p.role,
  CASE 
    WHEN p.role = 'admin' THEN '✅ ADMIN'
    ELSE '👤 USER'
  END as status,
  p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- Quick fix: Set admin role for specific email
-- Uncomment and run if you need to set admin role:
/*
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@gmail.com';

-- Verify the update
SELECT email, role, full_name 
FROM profiles 
WHERE email = 'admin@gmail.com';
*/

-- Check if admin_actions table is accessible
SELECT COUNT(*) as total_admin_actions
FROM admin_actions;

