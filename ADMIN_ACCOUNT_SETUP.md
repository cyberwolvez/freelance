# Admin Account Setup Guide

## ⚠️ Important: You CANNOT directly insert into auth.users

Supabase Auth uses its own password hashing system. Direct SQL inserts into `auth.users` with `crypt()` will NOT work for authentication.

## ✅ Correct Method: Sign Up Through the App

### Step 1: Sign Up Through the App
1. Open your app in the browser
2. Go to the sign-up page
3. Create an account with:
   - Email: `admin@gmail.com` (or `admin@timetracker.com`)
   - Password: `admin123`
   - Full Name: `Admin User`

### Step 2: Update Role to Admin
After signing up, run this SQL in your Supabase SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@gmail.com';
```

## Alternative: Use Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" or "Invite User"
3. Enter email: `admin@gmail.com`
4. Set a temporary password (user will be prompted to change it)
5. After user is created, run the SQL above to set role to 'admin'

## Alternative: Use Supabase Management API (for automation)

If you have access to the Supabase Management API, you can create users programmatically, but the simplest method is signing up through the app.

## Verify Admin Account

After setting up:
1. Log out if you're logged in
2. Log in with:
   - Email: `admin@gmail.com`
   - Password: `admin123`
3. You should see the "Admin" link in the navigation
4. Navigate to `/admin` to access the admin dashboard

## Troubleshooting

If you already inserted a user directly into `auth.users`:
1. Delete that user from `auth.users` table
2. Delete from `profiles` table if it exists
3. Follow the correct method above (sign up through app)

