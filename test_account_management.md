# Account Management Testing Guide

## New Features Added

### 1. User Account Management (Manager Only)
- **Access**: Only users with 'manager' role can see the "User Management" section
- **Features**:
  - View all user accounts
  - Edit user details (username, email, password, role)
  - Change user roles (staff, supervisor, manager)
  - Delete user accounts (cannot delete own account)

### 2. Role-Based Access Control
- **Staff**: Can only view their own information
- **Supervisor**: Can manage staff accounts and view schedules
- **Manager**: Full access to all account management features

### 3. Account Editing Features
- **Staff Account Editing**: Edit account status (active, suspended, no_account)
- **User Account Editing**: Edit username, email, password, and role
- **Password Management**: Leave password field blank to keep current password

### 4. Account Deletion
- **Safety Features**: 
  - Confirmation dialog before deletion
  - Cannot delete own account
  - All actions are logged in audit history

## Testing Steps

### 1. Login as Manager
1. Go to login page
2. Use username: `manager`, password: `manager123`
3. Navigate to Account Management tab
4. Verify "User Management" section is visible

### 2. Test User Role Changes
1. In User Management section, find a user
2. Use the "Change Role" dropdown to change their role
3. Verify the change is applied and logged

### 3. Test Account Editing
1. Click the edit icon on any user account
2. Modify username, email, or role
3. Leave password blank to keep current password
4. Save changes and verify they're applied

### 4. Test Account Deletion
1. Try to delete a user account
2. Verify confirmation dialog appears
3. Confirm deletion and verify account is removed
4. Try to delete your own account (should be disabled)

### 5. Test Staff Account Management
1. Test linking/unlinking staff accounts
2. Test account status changes (active/suspended)
3. Verify all actions are logged in audit history

## Database Schema Updates

The system now requires an email field in the users table. If you encounter errors, run the SQL commands in `update_users_table.sql`:

```sql
-- Add email field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Update existing users with placeholder emails
UPDATE users SET email = CONCAT(username, '@example.com') WHERE email IS NULL;

-- Make email field NOT NULL
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## Security Features

1. **Role-based permissions**: Only managers can access user management
2. **Audit logging**: All account changes are logged
3. **Self-protection**: Users cannot delete their own accounts
4. **Confirmation dialogs**: Destructive actions require confirmation
5. **Input validation**: Proper validation for all form fields
