# Staff Login System

This document explains the new staff login system that allows staff members to create accounts and access limited self-service features.

## Overview

The staff login system provides:
- **Staff Registration**: Staff can create accounts using verification codes from managers
- **Account Management**: Managers can link/unlink accounts, suspend/activate accounts
- **Staff Dashboard**: Staff can view their schedule, submit time off requests, and see role history
- **Audit Trail**: All account actions are logged for security and compliance

## Database Schema

### New Tables

1. **staff_verification**: Stores verification codes for account linking
2. **account_audit**: Logs all account management actions

### Updated Tables

1. **staff**: Added `user_id` and `account_status` columns

## Components

### 1. Account Management Tab (`/accounts`)
- **Manager-only access**
- View all staff with account status
- Create verification codes for staff
- Link/unlink accounts
- Suspend/activate accounts
- View audit history

### 2. Staff Registration (`/register`)
- **Public access**
- Staff enter verification code from manager
- Create account with username, email, password
- Automatically links to staff record

### 3. Staff Dashboard (`/dashboard`)
- **Staff access only**
- View personal information
- See current week's schedule
- View role assignment history
- Submit time off requests
- Check availability status

### 4. Login Form (`/login`)
- **Public access**
- Username/password authentication
- Redirects based on user role

## User Roles and Access

### Staff
- Access to Dashboard and Schedule Viewer
- Can submit time off requests
- Can view their own role history
- Cannot edit other staff or schedules

### Supervisor
- All Staff permissions
- Access to Schedule Builder
- Can assign staff to roles

### Manager
- All Supervisor permissions
- Access to Staff Management
- Access to Account Management
- Can create/edit/delete staff, roles, tours, shifts
- Can manage all accounts

## Account Status Types

- **no_account**: Staff member has no linked account
- **active**: Account is active and can log in
- **suspended**: Account is temporarily disabled

## Workflow

### 1. Staff Creates Account
1. Go to login page (`/login`)
2. Click "Register here" link
3. Create username, email, password
4. Account is created but not yet linked to staff record

### 2. Manager Links Account
1. Go to Account Management tab (`/accounts`)
2. Find the user account in "Unlinked User Accounts" section
3. Select the staff member from the dropdown
4. Account is now linked to staff record

### 3. Staff Uses Dashboard
1. Log in at `/login`
2. Access dashboard at `/dashboard`
3. View schedule, submit time off requests
4. See role assignment history

## Security Features

- **Verification Codes**: 6-character codes that expire in 24 hours
- **Account Status Management**: Managers can suspend problematic accounts
- **Audit Logging**: All account actions are tracked
- **Role-based Access**: Different permissions for different user types
- **Session Management**: 2-week session expiration

## API Endpoints

### Account Management
- `accountHelpers.linkStaffToUser(staffId, userId)`
- `accountHelpers.unlinkStaffFromUser(staffId)`
- `accountHelpers.updateAccountStatus(staffId, status)`
- `accountHelpers.getStaffWithAccounts()`

### Staff Verification
- `staffVerificationHelpers.createVerificationCode(staffId, email)`
- `staffVerificationHelpers.verifyCode(verificationCode)`
- `staffVerificationHelpers.markCodeAsUsed(verificationId)`

### Account Audit
- `accountAuditHelpers.logAction(staffId, action, performedBy, notes)`
- `accountAuditHelpers.getByStaffId(staffId)`
- `accountAuditHelpers.getAll()`

## Future Enhancements

- **Email Notifications**: Send verification codes via email
- **Password Reset**: Allow staff to reset forgotten passwords
- **Two-Factor Authentication**: Add 2FA for enhanced security
- **Bulk Account Creation**: Create multiple accounts at once
- **Account Templates**: Pre-configure accounts for new hires
- **Mobile App**: Native mobile app for staff access

## Troubleshooting

### Common Issues

1. **Verification Code Not Working**
   - Check if code has expired (24 hours)
   - Verify code was entered correctly
   - Check if code was already used

2. **Staff Can't Log In**
   - Check account status (should be "active")
   - Verify username/password are correct
   - Check if account is linked to staff record

3. **Manager Can't See Staff in Account Management**
   - Ensure staff record exists
   - Check if staff has email address
   - Verify database connection

### Support

For technical issues, check:
1. Browser console for errors
2. Network tab for failed requests
3. Database logs for SQL errors
4. Application logs for authentication issues
