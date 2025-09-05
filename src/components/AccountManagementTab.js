import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Alert,
  Paper,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { accountHelpers, staffVerificationHelpers, accountAuditHelpers, userHelpers } from '../lib/supabaseHelpers';
import { supabase } from '../lib/supabase';

function AccountManagementTab() {
  const { staff, dispatch } = useData();
  const { user: currentUser, hasPermission } = useAuth();
  const [staffWithAccounts, setStaffWithAccounts] = useState([]);
  const [unlinkedAccounts, setUnlinkedAccounts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    accountStatus: 'active',
    role: 'staff'
  });
  const [auditHistory, setAuditHistory] = useState([]);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    userManagement: false,
    unlinkedRecords: true
  });
  const [userFilter, setUserFilter] = useState('all'); // 'all', 'linked', 'unlinked'

  useEffect(() => {
    console.log('AccountManagementTab mounted, currentUser:', currentUser);
    loadStaffWithAccounts();
    loadUnlinkedAccounts();
    loadAuditHistory();
    loadAllUsers();
  }, [currentUser]);

  // Set default expanded state for managers
  useEffect(() => {
    if (hasPermission('manager')) {
      setExpandedSections(prev => ({
        ...prev,
        userManagement: true
      }));
    }
  }, [hasPermission]);

  const loadStaffWithAccounts = async () => {
    try {
      const data = await accountHelpers.getStaffWithAccounts();
      setStaffWithAccounts(data);
    } catch (error) {
      console.error('Error loading staff with accounts:', error);
    }
  };

  const loadUnlinkedAccounts = async () => {
    try {
      console.log('Loading unlinked accounts...');
      // Get all users (not just staff role)
      const { data, error } = await supabase
        .from('users')
        .select('*');
      
      if (error) throw error;
      console.log('All users:', data);
      
      // Get staff with accounts to check for linked users
      const staffData = await accountHelpers.getStaffWithAccounts();
      console.log('Staff with accounts:', staffData);
      
      // Filter out users that are already linked to staff records
      const linkedUserIds = staffData
        .filter(staff => staff.user_id)
        .map(staff => staff.user_id);
      console.log('Linked user IDs:', linkedUserIds);
      
      const unlinked = data.filter(user => !linkedUserIds.includes(user.id));
      console.log('Unlinked users:', unlinked);
      setUnlinkedAccounts(unlinked);
    } catch (error) {
      console.error('Error loading unlinked accounts:', error);
      setUnlinkedAccounts([]);
    }
  };

  const loadAuditHistory = async () => {
    try {
      const data = await accountAuditHelpers.getAll();
      setAuditHistory(data);
    } catch (error) {
      console.error('Error loading audit history:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const data = await userHelpers.getAll();
      setAllUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleOpenDialog = (staff = null, user = null) => {
    if (staff) {
      setEditingStaff(staff);
      setEditingUser(null);
      setFormData({
        username: staff.username || '',
        email: staff.email || '',
        password: '',
        accountStatus: staff.account_status || 'no_account',
        role: 'staff'
      });
    } else if (user) {
      setEditingUser(user);
      setEditingStaff(null);
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        accountStatus: 'active',
        role: user.role || 'staff'
      });
    } else {
      setEditingStaff(null);
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        accountStatus: 'active',
        role: 'staff'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingStaff(null);
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      accountStatus: 'active',
      role: 'staff'
    });
  };

  const handleSubmit = async () => {
    if (!editingStaff && !editingUser) return;

    try {
      if (editingStaff) {
        // Update account status
        await accountHelpers.updateAccountStatus(editingStaff.id, formData.accountStatus);
        
        // Log the action
        await accountAuditHelpers.logAction(
          editingStaff.id,
          'account_updated',
          null,
          `Account status changed to ${formData.accountStatus}`
        );

        // Reload data
        await loadStaffWithAccounts();
        await loadAuditHistory();
      } else if (editingUser) {
        // Update user details
        const updates = {
          username: formData.username,
          email: formData.email,
          role: formData.role
        };

        // Only update password if provided
        if (formData.password) {
          updates.password = formData.password;
        }

        await userHelpers.updateUser(editingUser.id, updates);
        
        // Log the action (find associated staff record if exists)
        const associatedStaff = staffWithAccounts.find(s => s.user_id === editingUser.id);
        if (associatedStaff) {
          await accountAuditHelpers.logAction(
            associatedStaff.id,
            'user_updated',
            currentUser?.id,
            `User role changed to ${formData.role}`
          );
        }

        // Reload data
        await loadAllUsers();
        await loadAuditHistory();
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Error updating account. Please try again.');
    }
  };

  const handleLinkAccount = async (staffId) => {
    try {
      // Create verification code
      const verification = await staffVerificationHelpers.createVerificationCode(
        staffId,
        staff.find(s => s.id === staffId)?.email || ''
      );
      
      // Log the action
      await accountAuditHelpers.logAction(
        staffId,
        'verification_code_created',
        null,
        `Verification code: ${verification.verification_code}`
      );

      alert(`Verification code created: ${verification.verification_code}\n\nShare this code with the staff member to link their account.`);
      
      // Reload data
      await loadStaffWithAccounts();
      await loadAuditHistory();
    } catch (error) {
      console.error('Error creating verification code:', error);
      alert('Error creating verification code. Please try again.');
    }
  };

  const handleUnlinkAccount = async (staffId) => {
    if (window.confirm('Are you sure you want to unlink this account?')) {
      try {
        console.log('Unlinking account for staff ID:', staffId);
        await accountHelpers.unlinkStaffFromUser(staffId);
        console.log('Account unlinked successfully');
        
        // Log the action
        await accountAuditHelpers.logAction(
          staffId,
          'account_unlinked',
          null,
          'Account unlinked from staff record'
        );

        // Reload data
        console.log('Reloading data after unlink...');
        await loadStaffWithAccounts();
        await loadUnlinkedAccounts(); // Add this line to refresh unlinked users
        await loadAuditHistory();
        console.log('Data reloaded');
      } catch (error) {
        console.error('Error unlinking account:', error);
        alert('Error unlinking account. Please try again.');
      }
    }
  };

  const handleSuspendAccount = async (staffId) => {
    try {
      await accountHelpers.updateAccountStatus(staffId, 'suspended');
      
      // Log the action
      await accountAuditHelpers.logAction(
        staffId,
        'account_suspended',
        null,
        'Account suspended'
      );

      // Reload data
      await loadStaffWithAccounts();
      await loadAuditHistory();
    } catch (error) {
      console.error('Error suspending account:', error);
      alert('Error suspending account. Please try again.');
    }
  };

  const handleActivateAccount = async (staffId) => {
    try {
      await accountHelpers.updateAccountStatus(staffId, 'active');
      
      // Log the action
      await accountAuditHelpers.logAction(
        staffId,
        'account_activated',
        null,
        'Account activated'
      );

      // Reload data
      await loadStaffWithAccounts();
      await loadAuditHistory();
    } catch (error) {
      console.error('Error activating account:', error);
      alert('Error activating account. Please try again.');
    }
  };

  const handleLinkAccountToStaff = async (userId, staffId) => {
    try {
      console.log('Attempting to link account:', userId, 'to staff:', staffId);
      
      await accountHelpers.linkStaffToUser(staffId, userId);
      console.log('Account linked successfully');
      
      // Log the action
      await accountAuditHelpers.logAction(
        staffId,
        'account_linked',
        currentUser?.id,
        'Account linked to staff record'
      );

      // Reload data
      await loadStaffWithAccounts();
      await loadUnlinkedAccounts();
      await loadAuditHistory();
      
      alert('Account linked successfully.');
    } catch (error) {
      console.error('Error linking account:', error);
      alert(`Error linking account: ${error.message || 'Please try again.'}`);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete the account for ${userName}? This action cannot be undone.`)) {
      try {
        console.log('Attempting to delete user:', userId, userName);
        
        // Find associated staff record before deletion
        const associatedStaff = staffWithAccounts.find(s => s.user_id === userId);
        console.log('Associated staff:', associatedStaff);
        
        // Check if user exists first
        const userExists = await userHelpers.userExists(userId);
        if (!userExists) {
          alert('User account not found.');
          return;
        }
        
        await userHelpers.deleteUser(userId);
        console.log('User deleted successfully');
        
        // Log the action if staff record exists
        if (associatedStaff) {
          await accountAuditHelpers.logAction(
            associatedStaff.id,
            'user_deleted',
            currentUser?.id,
            `User account deleted: ${userName}`
          );
        }

        // Reload data
        await loadAllUsers();
        await loadStaffWithAccounts();
        await loadUnlinkedAccounts();
        await loadAuditHistory();
        
        alert('User account deleted successfully.');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Error deleting user account: ${error.message || 'Please try again.'}`);
      }
    }
  };

  const handleUpdateUserRole = async (userId, newRole, userName) => {
    try {
      console.log('Attempting to update user role:', userId, newRole, userName);
      
      // Check if user exists first
      const userExists = await userHelpers.userExists(userId);
      if (!userExists) {
        alert('User account not found.');
        return;
      }
      
      await userHelpers.updateRole(userId, newRole);
      console.log('User role updated successfully');
      
      // Log the action (find associated staff record if exists)
      const associatedStaff = staffWithAccounts.find(s => s.user_id === userId);
      if (associatedStaff) {
        await accountAuditHelpers.logAction(
          associatedStaff.id,
          'role_updated',
          currentUser?.id,
          `User role changed from ${userName} to ${newRole}`
        );
      }

      // Reload data
      await loadAllUsers();
      await loadAuditHistory();
      
      alert(`User role updated to ${newRole} successfully.`);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert(`Error updating user role: ${error.message || 'Please try again.'}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'no_account': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'suspended': return 'Suspended';
      case 'no_account': return 'No Account';
      default: return status;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'manager': return 'error';
      case 'supervisor': return 'warning';
      case 'staff': return 'primary';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'manager': return 'Manager';
      case 'supervisor': return 'Supervisor';
      case 'staff': return 'Staff';
      default: return role;
    }
  };

  const handleAccordionChange = (section) => (event, isExpanded) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: isExpanded
    }));
  };

  // Get filtered users based on current filter
  const getFilteredUsers = () => {
    const linkedUserIds = staffWithAccounts
      .filter(staff => staff.user_id)
      .map(staff => staff.user_id);

    switch (userFilter) {
      case 'linked':
        return allUsers.filter(user => linkedUserIds.includes(user.id));
      case 'unlinked':
        return allUsers.filter(user => !linkedUserIds.includes(user.id));
      default:
        return allUsers;
    }
  };

  // Check if a user is linked to a staff record
  const isUserLinked = (userId) => {
    return staffWithAccounts.some(staff => staff.user_id === userId);
  };

  // Get the staff record for a linked user
  const getStaffForUser = (userId) => {
    return staffWithAccounts.find(staff => staff.user_id === userId);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Account Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setShowAuditHistory(!showAuditHistory)}
          >
            {showAuditHistory ? 'Hide' : 'Show'} Audit History
          </Button>
        </Box>
      </Box>

      {showAuditHistory && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Account Audit History
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Staff</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditHistory.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>
                        {new Date(audit.performed_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{audit.staff?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Chip
                          label={audit.action.replace('_', ' ')}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>{audit.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* User Management Section */}
      {hasPermission('manager') && (
        <Accordion 
          expanded={expandedSections.userManagement} 
          onChange={handleAccordionChange('userManagement')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">User Account Management</Typography>
              <Chip 
                label={`${getFilteredUsers().length} users`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Manage user accounts, roles, and permissions. Only managers can access this section.
            </Typography>
            
            {/* Filter Controls */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" fontWeight="medium">
                Filter:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Account Status</InputLabel>
                <Select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  label="Account Status"
                >
                  <MenuItem value="all">All Users</MenuItem>
                  <MenuItem value="linked">Linked Accounts</MenuItem>
                  <MenuItem value="unlinked">Unlinked Accounts</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Grid container spacing={2}>
              {getFilteredUsers().map((user) => {
                const isLinked = isUserLinked(user.id);
                const staffRecord = getStaffForUser(user.id);
                return (
                  <Grid item xs={12} sm={6} md={4} key={user.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="div">
                          {user.name}
                        </Typography>
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(null, user)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Box>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Username:</strong> {user.username}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Email:</strong> {user.email || 'Not set'}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Role:</strong>
                          <Chip
                            label={getRoleLabel(user.role)}
                            color={getRoleColor(user.role)}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Status:</strong>
                          <Chip
                            label={isLinked ? 'Linked' : 'Unlinked'}
                            color={isLinked ? 'success' : 'warning'}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        {isLinked && staffRecord && (
                          <Typography variant="body2" gutterBottom>
                            <strong>Staff:</strong> {staffRecord.name}
                          </Typography>
                        )}
                        <Typography variant="body2" gutterBottom>
                          <strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel>Change Role</InputLabel>
                          <Select
                            value=""
                            onChange={(e) => {
                              console.log('Role change selected:', e.target.value, 'for user:', user.name);
                              handleUpdateUserRole(user.id, e.target.value, user.name);
                            }}
                            label="Change Role"
                          >
                            <MenuItem value="staff">Staff</MenuItem>
                            <MenuItem value="supervisor">Supervisor</MenuItem>
                            <MenuItem value="manager">Manager</MenuItem>
                          </Select>
                        </FormControl>

                        {!isLinked && (
                          <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Link to Staff</InputLabel>
                            <Select
                              value=""
                              onChange={(e) => {
                                console.log('Linking user:', user.name, 'to staff:', e.target.value);
                                handleLinkAccountToStaff(user.id, e.target.value);
                              }}
                              label="Link to Staff"
                            >
                              {staff
                                .filter(staffMember => !staffMember.user_id)
                                .map((staffMember) => (
                                  <MenuItem key={staffMember.id} value={staffMember.id}>
                                    {staffMember.name}
                                  </MenuItem>
                                ))}
                            </Select>
                          </FormControl>
                        )}

                        {isLinked && staffRecord && (
                          <Button
                            size="small"
                            startIcon={<UnlinkIcon />}
                            onClick={() => handleUnlinkAccount(staffRecord.id)}
                            color="warning"
                          >
                            Unlink
                          </Button>
                        )}
                        
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => {
                            console.log('Delete button clicked for user:', user.name, user.id);
                            handleDeleteUser(user.id, user.name);
                          }}
                          color="error"
                          disabled={user.id === currentUser?.id}
                        >
                          Delete
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                  </Grid>
                );
              })}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}


      {/* Unlinked Records Section */}
      <Accordion 
        expanded={expandedSections.unlinkedRecords} 
        onChange={handleAccordionChange('unlinkedRecords')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon color="info" />
            <Typography variant="h6">Unlinked Records</Typography>
            <Chip 
              label={`${staffWithAccounts.filter(staff => !staff.user_id).length} staff`} 
              size="small" 
              color="info" 
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These staff members don't have user accounts yet. They can create accounts by going to the registration page.
          </Typography>
          <Grid container spacing={2}>
            {staffWithAccounts
              .filter(staff => !staff.user_id)
              .map((staff) => (
                <Grid item xs={12} sm={6} md={4} key={staff.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {staff.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Email: {staff.email || 'Not set'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Status: <Chip label="No Account" color="default" size="small" />
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            {staffWithAccounts.filter(staff => !staff.user_id).length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" align="center">
                  All staff members have accounts
                </Typography>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>


      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStaff ? 'Edit Staff Account' : editingUser ? 'Edit User Account' : 'Create Account'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
              helperText={editingUser ? "Leave blank to keep current password" : ""}
            />
            
            {editingUser && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  label="Role"
                >
                  <MenuItem value="staff">Staff</MenuItem>
                  <MenuItem value="supervisor">Supervisor</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                </Select>
              </FormControl>
            )}
            
            {editingStaff && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Account Status</InputLabel>
                <Select
                  value={formData.accountStatus}
                  onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value })}
                  label="Account Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="no_account">No Account</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingStaff || editingUser ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AccountManagementTab;
