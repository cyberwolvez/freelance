# Admin Account Setup

To create an admin account for testing:

## Option 1: Using Supabase Dashboard

1. Sign up a new user through the app with email: `admin@timetracker.com` and password: `admin123`
2. Run the migration `20250101000001_create_admin_account.sql` in your Supabase SQL editor
3. This will set the role to 'admin' for that user

## Option 2: Direct SQL (if user already exists)

Run this SQL in your Supabase SQL editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@timetracker.com';
```

## Option 3: Create via Supabase Auth and then update

1. Create a user via Supabase Auth dashboard or API
2. Run the migration to set their role to admin

## Testing Admin Access

After setting up the admin account:
- Email: `admin@timetracker.com`
- Password: `admin123`
- Navigate to `/admin` to access the admin dashboard

