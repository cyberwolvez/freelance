# Admin Account Troubleshooting Guide

## Quick Verification Steps

### 1. Check Your Account Role in Database

Run this SQL in Supabase SQL Editor (replace `admin@gmail.com` with your email):

```sql
SELECT 
  p.email,
  p.full_name,
  p.role,
  CASE 
    WHEN p.role = 'admin' THEN '✅ ADMIN'
    WHEN p.role = 'user' THEN '❌ USER (Not Admin)'
    ELSE '⚠️ UNKNOWN ROLE'
  END as status
FROM profiles p
WHERE p.email = 'admin@gmail.com';
```

### 2. If Role is NOT 'admin', Fix It:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@gmail.com';
```

### 3. Verify the Update:

```sql
SELECT email, role, full_name 
FROM profiles 
WHERE email = 'admin@gmail.com';
```

## What Should Happen When You're Admin

1. **Navigation Bar**: You should see an "Admin" link in the navigation (with Shield icon)
2. **Admin Badge**: You should see a purple "Admin" badge next to the Sign Out button
3. **Admin Access**: You can navigate to `/admin` and see:
   - Admin Dashboard
   - User Management
   - Activity Logs

## If Admin Link Still Doesn't Show

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for: `User role fetched: admin for email: your@email.com`
4. If you see `User role fetched: user`, the role is not set correctly

### Step 2: Hard Refresh
- Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- This clears cache and reloads the app

### Step 3: Log Out and Log Back In
1. Click "Sign Out"
2. Log back in with your admin credentials
3. The role should be fetched fresh from the database

### Step 4: Check Database Connection
Make sure your Supabase connection is working:
- Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check browser console for any Supabase connection errors

## Complete Verification Script

Use the file `supabase/verify_admin_account.sql` for a complete check:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `verify_admin_account.sql`
4. Replace `admin@gmail.com` with your email
5. Run the script
6. Check the results

## Common Issues

### Issue: "User role fetched: user" in console
**Solution**: Your role in database is 'user', not 'admin'. Run the UPDATE SQL above.

### Issue: No "Admin" link in navigation
**Solution**: 
1. Verify role is 'admin' in database
2. Hard refresh browser (Ctrl+Shift+R)
3. Log out and log back in

### Issue: Can't access /admin (redirects to /403)
**Solution**: Your role check is failing. Verify:
1. Role is 'admin' in profiles table
2. User ID matches between auth.users and profiles
3. Check browser console for errors

### Issue: Role shows correctly but still can't see admin features
**Solution**: Clear browser cache and localStorage:
1. Open DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. Refresh page

## Testing Admin Features

Once you see the Admin link:

1. **Click "Admin" in navigation** → Should go to `/admin`
2. **Admin Dashboard** → Should show:
   - Total Users count
   - Admin Users count
   - Recent Admin Activity
3. **User Management** → Should show all users with ability to:
   - Change roles
   - Delete users
   - View user details
4. **Activity Logs** → Should show all admin actions

## Still Having Issues?

1. Check browser console for errors
2. Verify Supabase connection is working
3. Ensure migrations have been run:
   - `20250101000000_admin_features.sql`
   - `20250101000001_create_admin_account.sql` (optional)
4. Check that `profiles` table has `role` column
5. Verify RLS policies allow reading your own profile

