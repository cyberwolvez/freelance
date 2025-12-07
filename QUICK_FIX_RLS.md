# Quick Fix for RLS Recursion Error

## The Problem
You're getting: `infinite recursion detected in policy for relation "profiles"`

This happens because the RLS policy tries to check if a user is admin by querying the `profiles` table, which triggers the same policy again, creating an infinite loop.

## The Solution

Run this SQL in your Supabase SQL Editor:

```sql
-- Step 1: Drop all existing problematic policies
DROP POLICY IF EXISTS "Only admins can update user roles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile role" ON profiles;

-- Step 2: Drop the function if it exists (in case of previous failed attempt)
DROP FUNCTION IF EXISTS check_is_admin(uuid);

-- Step 3: Create a SECURITY DEFINER function that bypasses RLS to check admin status
-- This prevents infinite recursion
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

-- Step 4: Allow admins to update any profile (for role changes)
CREATE POLICY "Admins can update any profile role"
  ON profiles FOR UPDATE
  TO authenticated
  USING (check_is_admin(auth.uid()))
  WITH CHECK (check_is_admin(auth.uid()));

-- Step 5: Allow admins to read all profiles (for admin dashboard)
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (check_is_admin(auth.uid()));
```

## After Running the Fix

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R)
2. **Log out and log back in**
3. **Try accessing `/admin` again**
4. **Check browser console** - you should see the profile data now

## Verify It Works

Run this to test (replace with your user ID):

```sql
-- Test the function (make sure to cast the string to uuid)
SELECT check_is_admin('3707db81-0dea-4b59-a17c-91a4ec93b987'::uuid);

-- Or test with your email
SELECT check_is_admin(
  (SELECT id FROM auth.users WHERE email = 'admin@gmail.com')
);

-- Should return: true (if you're admin) or false (if not)
```

## What Changed

- **Before**: Policy queried `profiles` directly, causing recursion
- **After**: Uses `SECURITY DEFINER` function that bypasses RLS to check admin status
- **Result**: No more infinite recursion, admin checks work properly

