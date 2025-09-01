import React, { useState, useRef, useEffect } from 'react';
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
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { format } from 'date-fns';
import { staffHelpers, timeOffHelpers } from '../lib/supabaseHelpers';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function StaffTab() {
  const { 
    staff, 
    roles, 
    timeOffRequests, 
    dispatch,
    // Use optimized lookup functions
    getStaffById,
    getRoleById,
    getTimeOffByStaffId
  } = useData();
  const [openDialog, setOpenDialog] = useState(false);
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
  const [timeOffListOpen, setTimeOffListOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const nameInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    hireDate: '',
    availability: DAYS_OF_WEEK,
    trainedRoles: [],
    targetShifts: 5,
  });
  const [timeOffForm, setTimeOffForm] = useState({
    staffId: '',
    startDate: '',
    endDate: '',
    reason: '',
    isApproved: false,
  });

  // Sort state
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleOpenDialog = (staff = null) => {
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        name: staff.name,
        email: staff.email || '',
        phone: staff.phone || '',
        hireDate: staff.hire_date || '',
        availability: staff.availability || DAYS_OF_WEEK,
        trainedRoles: staff.trained_roles || [],
        targetShifts: staff.target_shifts || 5,
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        hireDate: '',
        availability: DAYS_OF_WEEK,
        trainedRoles: [],
        targetShifts: 5,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      hireDate: '',
      availability: DAYS_OF_WEEK,
      trainedRoles: [],
      targetShifts: 5,
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      // Test Supabase connection first
      console.log('Testing Supabase connection...');
      console.log('Staff data to save:', {
        name: formData.name.trim(),
        hire_date: formData.hireDate || null,
        staff_color: 'gray',
        trained_roles: formData.trainedRoles,
        availability: formData.availability,
        email: formData.email || null,
        phone: formData.phone || null,
        target_shifts: formData.targetShifts || 5,
      });
      const staffData = {
        name: formData.name.trim(),
        hire_date: formData.hireDate || null,
        staff_color: 'gray', // Default color
        trained_roles: formData.trainedRoles,
        availability: formData.availability,
        email: formData.email || null,
        phone: formData.phone || null,
        target_shifts: formData.targetShifts || 5,
      };

      if (editingStaff) {
        const updatedStaff = await staffHelpers.update(editingStaff.id, staffData);
        dispatch({ type: 'UPDATE_STAFF', payload: updatedStaff });
      } else {
        const newStaff = await staffHelpers.add(staffData);
        dispatch({ type: 'ADD_STAFF', payload: newStaff });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving staff:', error);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
      alert(`Error saving staff member: ${error.message}. Please try again.`);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        await staffHelpers.delete(staffId);
        dispatch({ type: 'DELETE_STAFF', payload: staffId });
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Error deleting staff member. Please try again.');
      }
    }
  };

  const handleAvailabilityChange = (day) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(day)
        ? prev.availability.filter(d => d !== day)
        : [...prev.availability, day]
    }));
  };

  const handleTrainedRolesChange = (roleId) => {
    setFormData(prev => ({
      ...prev,
      trainedRoles: prev.trainedRoles.includes(roleId)
        ? prev.trainedRoles.filter(r => r !== roleId)
        : [...prev.trainedRoles, roleId]
    }));
  };

  const handleTimeOffSubmit = async () => {
    if (!timeOffForm.staffId || !timeOffForm.startDate || !timeOffForm.endDate) return;

    try {
      const timeOffData = {
        staff_id: timeOffForm.staffId,
        start_date: timeOffForm.startDate,
        end_date: timeOffForm.endDate,
        status: timeOffForm.isApproved ? 'approved' : 'pending',
      };

      const newTimeOff = await timeOffHelpers.add(timeOffData);
      dispatch({ type: 'ADD_TIME_OFF_REQUEST', payload: newTimeOff });
      
      setTimeOffForm({
        staffId: '',
        startDate: '',
        endDate: '',
        reason: '',
        isApproved: false,
      });
      setTimeOffDialogOpen(false);
    } catch (error) {
      console.error('Error adding time off request:', error);
      alert('Error adding time off request. Please try again.');
    }
  };

  const handleTimeOffStatusChange = async (requestId, newStatus) => {
    const request = timeOffRequests.find(r => r.id === requestId);
    if (request) {
      try {
        const updatedRequest = await timeOffHelpers.update(requestId, { 
          status: newStatus 
        });
        dispatch({
          type: 'UPDATE_TIME_OFF_REQUEST',
          payload: updatedRequest
        });
      } catch (error) {
        console.error('Error updating time off request:', error);
        alert('Error updating time off request. Please try again.');
      }
    }
  };

  const getStaffName = (staffId) => {
    const staffMember = getStaffById(staffId);
    return staffMember ? staffMember.name : 'Unknown Staff';
  };

  // Auto-focus on name input when dialog opens
  useEffect(() => {
    if (openDialog && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [openDialog]);

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const getStaffTimeOff = (staffId) => {
    return timeOffRequests.filter(t => t.staff_id === staffId && t.status === 'approved');
  };

  const getStaffAvailabilityStatus = (staff) => {
    const today = new Date();
    const dayOfWeek = DAYS_OF_WEEK[today.getDay() === 0 ? 6 : today.getDay() - 1];
    const hasTimeOff = getStaffTimeOff(staff.id).some(t => {
      const startDate = new Date(t.startDate);
      const endDate = new Date(t.endDate);
      return today >= startDate && today <= endDate;
    });

    if (hasTimeOff) {
      return { status: 'time-off', message: 'Time Off' };
    }
    if (!staff.availability || !staff.availability.includes(dayOfWeek)) {
      return { status: 'unavailable', message: 'Not Available' };
    }
    return { status: 'available', message: 'Available' };
  };

  const calculateTenure = (hireDate) => {
    if (!hireDate) return null;
    
    const hire = new Date(hireDate);
    const today = new Date();
    const diffTime = Math.abs(today - hire);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0) {
      return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? `, ${months} month${months !== 1 ? 's' : ''}` : ''}`;
    } else if (months > 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  };

  const getSortedStaff = () => {
    const sorted = [...staff].sort((a, b) => {
      let aValue, bValue;
      
      if (sortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortBy === 'hireDate') {
        aValue = a.hireDate ? new Date(a.hireDate) : new Date(0);
        bValue = b.hireDate ? new Date(b.hireDate) : new Date(0);
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Staff Management</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* Sort Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Sort by:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                displayEmpty
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="hireDate">Hire Date</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              size="small"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </IconButton>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={() => setTimeOffDialogOpen(true)}
          >
            Time Off Request
          </Button>
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={() => setTimeOffListOpen(true)}
          >
            View Time Off Requests
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Staff Member
          </Button>
        </Box>
      </Box>

             <Grid container spacing={3}>
         {getSortedStaff().map((member) => {
           const availabilityStatus = getStaffAvailabilityStatus(member);
           const timeOffRequests = getStaffTimeOff(member.id);
          
          return (
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
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteStaff(member.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {member.email && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {member.email}
                    </Typography>
                  )}
                  {member.phone && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {member.phone}
                    </Typography>
                  )}
                                     {member.hire_date && (
                     <Typography variant="body2" color="text.secondary" gutterBottom>
                       <strong>Hire Date:</strong> {format(new Date(member.hire_date), 'MMM dd, yyyy')}
                       <Typography component="span" variant="body2" color="primary" sx={{ ml: 1 }}>
                         ({calculateTenure(member.hire_date)})
                       </Typography>
                     </Typography>
                   )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Target Shifts:</strong> {member.target_shifts || 5}
                    </Typography>
                    
                    <Typography variant="body2" gutterBottom>
                      <strong>Total Shifts Worked:</strong> {member.shiftCount || 0}
                    </Typography>
                    
                    {member.roleCounts && Object.keys(member.roleCounts).length > 0 && (
                      <Typography variant="body2" gutterBottom>
                        <strong>Shifts by Role:</strong>
                      </Typography>
                    )}
                                         {member.roleCounts && Object.keys(member.roleCounts).map(roleId => {
                       const role = getRoleById(roleId);
                       return role ? (
                         <Typography key={roleId} variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                           • {role.name}: {member.roleCounts[roleId]} shifts
                         </Typography>
                       ) : null;
                     })}
                    
                    <Typography variant="body2" gutterBottom>
                      <strong>Status:</strong>
                      <Chip
                        label={availabilityStatus.message}
                        color={
                          availabilityStatus.status === 'available' ? 'success' :
                          availabilityStatus.status === 'time-off' ? 'warning' : 'error'
                        }
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Typography>

                    {timeOffRequests.length > 0 && (
                      <Alert severity="warning" sx={{ mt: 1, fontSize: '0.75rem' }}>
                        Has approved time off requests
                      </Alert>
                    )}

                    <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
                      <strong>Trained Roles:</strong>
                    </Typography>
                                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                       {member.trained_roles && member.trained_roles.map(roleId => {
                         const role = getRoleById(roleId);
                         return role ? (
                           <Chip
                             key={roleId}
                             label={role.name}
                             size="small"
                             variant="outlined"
                           />
                         ) : null;
                       })}
                     </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyPress={handleKeyPress}
              inputRef={nameInputRef}
              margin="normal"
              required
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
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Hire Date"
              type="date"
              value={formData.hireDate}
              onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Target Shifts per Week"
              type="number"
              value={formData.targetShifts}
              onChange={(e) => setFormData({ ...formData, targetShifts: parseInt(e.target.value) || 0 })}
              margin="normal"
              inputProps={{ min: 0, max: 7 }}
            />

            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Availability
            </Typography>
            <FormGroup row>
              {DAYS_OF_WEEK.map((day) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Switch
                      checked={formData.availability.includes(day)}
                      onChange={() => handleAvailabilityChange(day)}
                    />
                  }
                  label={day}
                />
              ))}
            </FormGroup>

            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Trained Roles
            </Typography>
            <FormGroup row>
              {roles.map((role) => (
                <FormControlLabel
                  key={role.id}
                  control={
                    <Switch
                      checked={formData.trainedRoles.includes(role.id)}
                      onChange={() => handleTrainedRolesChange(role.id)}
                    />
                  }
                  label={role.name}
                />
              ))}
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingStaff ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Time Off Request Dialog */}
      <Dialog open={timeOffDialogOpen} onClose={() => setTimeOffDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Time Off</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Staff Member *</InputLabel>
              <Select
                value={timeOffForm.staffId}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, staffId: e.target.value })}
                label="Staff Member *"
              >
                {staff.map((member) => (
                  <MenuItem key={member.id} value={member.id}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Start Date *"
              type="date"
              value={timeOffForm.startDate}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, startDate: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="End Date *"
              type="date"
              value={timeOffForm.endDate}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, endDate: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Reason (Optional)"
              value={timeOffForm.reason}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={timeOffForm.isApproved}
                  onChange={(e) => setTimeOffForm({ ...timeOffForm, isApproved: e.target.checked })}
                />
              }
              label="Pre-approve this request"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimeOffDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTimeOffSubmit} variant="contained">
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Time Off Requests List Dialog */}
      <Dialog open={timeOffListOpen} onClose={() => setTimeOffListOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Time Off Requests</DialogTitle>
        <DialogContent>
          <List>
            {timeOffRequests.map((request) => (
              <ListItem key={request.id} divider>
                <ListItemText
                  primary={getStaffName(request.staff_id)}
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        {format(new Date(request.start_date), 'MMM dd, yyyy')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                      </Typography>
                      {request.reason && (
                        <Typography variant="body2" color="text.secondary">
                          Reason: {request.reason}
                        </Typography>
                      )}
                      <Chip
                        label={request.status}
                        color={request.status === 'approved' ? 'success' : 'warning'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  {request.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        color="success"
                        onClick={() => handleTimeOffStatusChange(request.id, 'approved')}
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleTimeOffStatusChange(request.id, 'denied')}
                      >
                        <CancelIcon />
                      </IconButton>
                    </Box>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {timeOffRequests.length === 0 && (
              <ListItem>
                <ListItemText primary="No time off requests found" />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimeOffListOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StaffTab;
