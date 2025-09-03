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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  LinkOff as UnlinkIcon,
  PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { accountHelpers, staffVerificationHelpers, accountAuditHelpers } from '../lib/supabaseHelpers';
import { supabase } from '../lib/supabase';

function AccountManagementTab() {
  const { staff, dispatch } = useData();
  const [staffWithAccounts, setStaffWithAccounts] = useState([]);
  const [unlinkedAccounts, setUnlinkedAccounts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    accountStatus: 'active'
  });
  const [auditHistory, setAuditHistory] = useState([]);
  const [showAuditHistory, setShowAuditHistory] = useState(false);

  useEffect(() => {
    loadStaffWithAccounts();
    loadUnlinkedAccounts();
    loadAuditHistory();
  }, []);

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
      // Get all staff users that are not linked to any staff record
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'staff');
      
      if (error) throw error;
      
      // Filter out users that are already linked to staff records
      const linkedUserIds = staffWithAccounts
        .filter(staff => staff.user_id)
        .map(staff => staff.user_id);
      
      const unlinked = data.filter(user => !linkedUserIds.includes(user.id));
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

  const handleOpenDialog = (staff = null) => {
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        username: staff.username || '',
        email: staff.email || '',
        password: '',
        accountStatus: staff.account_status || 'no_account'
      });
    } else {
      setEditingStaff(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        accountStatus: 'active'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingStaff(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      accountStatus: 'active'
    });
  };

  const handleSubmit = async () => {
    if (!editingStaff) return;

    try {
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
        await accountHelpers.unlinkStaffFromUser(staffId);
        
        // Log the action
        await accountAuditHelpers.logAction(
          staffId,
          'account_unlinked',
          null,
          'Account unlinked from staff record'
        );

        // Reload data
        await loadStaffWithAccounts();
        await loadAuditHistory();
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
      await accountHelpers.linkStaffToUser(staffId, userId);
      
      // Log the action
      await accountAuditHelpers.logAction(
        staffId,
        'account_linked',
        null,
        'Account linked to staff record'
      );

      // Reload data
      await loadStaffWithAccounts();
      await loadUnlinkedAccounts();
      await loadAuditHistory();
    } catch (error) {
      console.error('Error linking account:', error);
      alert('Error linking account. Please try again.');
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

      {/* Unlinked Accounts Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Unlinked User Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These user accounts were created by staff but haven't been linked to staff records yet.
          </Typography>
          <Grid container spacing={2}>
            {unlinkedAccounts.map((user) => (
              <Grid item xs={12} sm={6} md={4} key={user.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {user.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Username: {user.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Email: {user.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Created: {new Date(user.created_at).toLocaleDateString()}
                    </Typography>
                    
                    {/* Staff Selection Dropdown */}
                    <FormControl fullWidth size="small" sx={{ mt: 2, mb: 1 }}>
                      <InputLabel>Link to Staff Member</InputLabel>
                      <Select
                        value=""
                        onChange={(e) => handleLinkAccountToStaff(user.id, e.target.value)}
                        label="Link to Staff Member"
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
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {unlinkedAccounts.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" align="center">
                  No unlinked accounts found
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Staff Without Accounts Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Staff Without Accounts
          </Typography>
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
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {staffWithAccounts.map((member) => (
          <Grid item xs={12} md={6} lg={4} key={member.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {member.name}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(member)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Email:</strong> {member.email || 'Not set'}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Account Status:</strong>
                    <Chip
                      label={getStatusLabel(member.account_status)}
                      color={getStatusColor(member.account_status)}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  {member.user_id && (
                    <Typography variant="body2" gutterBottom>
                      <strong>User ID:</strong> {member.user_id.substring(0, 8)}...
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {member.account_status === 'no_account' && (
                    <Button
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => handleLinkAccount(member.id)}
                    >
                      Create Link
                    </Button>
                  )}
                  
                  {member.account_status === 'active' && (
                    <>
                      <Button
                        size="small"
                        startIcon={<UnlinkIcon />}
                        onClick={() => handleUnlinkAccount(member.id)}
                        color="warning"
                      >
                        Unlink
                      </Button>
                      <Button
                        size="small"
                        startIcon={<SecurityIcon />}
                        onClick={() => handleSuspendAccount(member.id)}
                        color="warning"
                      >
                        Suspend
                      </Button>
                    </>
                  )}
                  
                  {member.account_status === 'suspended' && (
                    <Button
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={() => handleActivateAccount(member.id)}
                      color="success"
                    >
                      Activate
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStaff ? 'Edit Account' : 'Create Account'}
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
            />
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingStaff ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AccountManagementTab;
