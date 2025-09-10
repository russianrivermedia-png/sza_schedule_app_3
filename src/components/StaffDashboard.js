import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Event as EventIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { timeOffHelpers, roleAssignmentsHelpers, staffHelpers } from '../lib/supabaseHelpers';
import { format, startOfWeek, addDays } from 'date-fns';

function StaffDashboard() {
  const { user, getStaffMember } = useAuth();
  const { timeOffRequests, roles, schedules, staff, shifts } = useData();
  const [staffMember, setStaffMember] = useState(null);
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [editInfoDialogOpen, setEditInfoDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    phone: ''
  });
  const [roleAssignments, setRoleAssignments] = useState([]);
  const [roleSummary, setRoleSummary] = useState({});

  useEffect(() => {
    const loadStaffData = async () => {
      if (user) {
        const staff = await getStaffMember();
        setStaffMember(staff);
        if (staff) {
          loadRoleAssignments();
          loadRoleSummary();
        }
      }
    };
    loadStaffData();
  }, [user]);

  const loadRoleAssignments = async () => {
    if (!staffMember?.id) return;
    try {
      const assignments = await roleAssignmentsHelpers.getByStaff(staffMember.id);
      setRoleAssignments(assignments);
    } catch (error) {
      console.error('Error loading role assignments:', error);
    }
  };

  const loadRoleSummary = async () => {
    if (!staffMember?.id) return;
    try {
      const summary = await roleAssignmentsHelpers.getSummaryByStaff(staffMember.id);
      setRoleSummary(summary);
    } catch (error) {
      console.error('Error loading role summary:', error);
    }
  };

  const handleTimeOffSubmit = async () => {
    try {
      await timeOffHelpers.add({
        staff_id: staffMember.id,
        start_date: timeOffForm.startDate,
        end_date: timeOffForm.endDate,
        reason: timeOffForm.reason,
        status: 'pending'
      });

      setTimeOffDialogOpen(false);
      setTimeOffForm({
        startDate: '',
        endDate: '',
        reason: ''
      });
      
      // Refresh data
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error submitting time off request:', error);
      alert('Error submitting time off request. Please try again.');
    }
  };

  const handleEditInfo = () => {
    setEditForm({
      email: staffMember.email || '',
      phone: staffMember.phone || ''
    });
    setEditInfoDialogOpen(true);
  };

  const handleEditInfoSubmit = async () => {
    try {
      await staffHelpers.update(staffMember.id, {
        email: editForm.email,
        phone: editForm.phone
      });

      // Update local state
      setStaffMember(prev => ({
        ...prev,
        email: editForm.email,
        phone: editForm.phone
      }));

      setEditInfoDialogOpen(false);
      alert('Information updated successfully!');
    } catch (error) {
      console.error('Error updating information:', error);
      alert('Error updating information. Please try again.');
    }
  };

  const handleCancelTimeOffRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to cancel this time off request?')) {
      try {
        await timeOffHelpers.delete(requestId);
        // Refresh data
        window.location.reload();
      } catch (error) {
        console.error('Error canceling time off request:', error);
        alert('Error canceling time off request. Please try again.');
      }
    }
  };

  const getStaffTimeOff = () => {
    return timeOffRequests.filter(t => t.staff_id === staffMember.id);
  };

  // Helper function to check if request is within next 2 weeks
  const isWithinNextTwoWeeks = (startDate) => {
    if (!startDate) return false;
    const today = new Date();
    const twoWeeksFromNow = new Date(today.getTime() + (14 * 24 * 60 * 60 * 1000));
    const requestDate = new Date(startDate);
    return requestDate <= twoWeeksFromNow && requestDate >= today;
  };

  // Helper function to check if request is longer than 7 days
  const isLongerThanSevenDays = (startDate, endDate) => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    return diffDays > 7;
  };

  // Helper function to check for overlapping time off requests
  const getOverlappingRequests = (startDate, endDate, excludeRequestId = null) => {
    if (!startDate || !endDate) return [];
    
    const requestStart = new Date(startDate);
    const requestEnd = new Date(endDate);
    
    return timeOffRequests.filter(request => {
      // Skip the current request if we're editing
      if (excludeRequestId && request.id === excludeRequestId) return false;
      
      // Only check approved and pending requests
      if (!['approved', 'pending'].includes(request.status)) return false;
      
      const existingStart = new Date(request.start_date);
      const existingEnd = new Date(request.end_date);
      
      // Check if dates overlap
      return requestStart <= existingEnd && requestEnd >= existingStart;
    });
  };

  const getNext7DaysShifts = () => {
    const today = new Date();
    const next7Days = [];
    
    // Generate next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      next7Days.push({
        date: date,
        dayName: format(date, 'EEEE'), // Monday, Tuesday, etc.
        dateString: format(date, 'yyyy-MM-dd'),
        shifts: []
      });
    }
    
    // Find shifts for each day across all schedules
    schedules.forEach((schedule) => {
      if (schedule.days && typeof schedule.days === 'object') {
        Object.keys(schedule.days).forEach(dayKey => {
          // Skip metadata keys
          if (dayKey === 'week_key' || dayKey === 'week_start') return;
          
          const dayData = schedule.days[dayKey];
          if (dayData && dayData.shifts && Array.isArray(dayData.shifts)) {
            dayData.shifts.forEach((shift) => {
              // Check if this staff member is assigned to any role in this shift
              const isAssigned = shift.assignedStaff && 
                Object.values(shift.assignedStaff).some(assignedStaffId => 
                  assignedStaffId === staffMember.id
                );
              
              if (isAssigned) {
                // Try to match this shift to one of our next 7 days
                next7Days.forEach(dayInfo => {
                  // Check if this shift falls on this day
                  if (dayKey === dayInfo.dateString) {
                    // Get the role name for this staff member
                    const assignedRoleId = Object.keys(shift.assignedStaff).find(roleId => 
                      shift.assignedStaff[roleId] === staffMember.id
                    );
                    const role = roles.find(r => r.id === assignedRoleId);
                    const roleName = role ? role.name : 'Unassigned';
                    
                    // Get shift template info
                    const shiftTemplate = shifts.find(s => s.id === shift.shiftId);
                    const startTime = shiftTemplate ? shiftTemplate.start_time : 'TBD';
                    const endTime = shiftTemplate ? shiftTemplate.end_time : 'TBD';
                    
                    dayInfo.shifts.push({
                      ...shift,
                      role: roleName,
                      start_time: startTime,
                      end_time: endTime,
                      shiftName: shiftTemplate ? shiftTemplate.name : shift.name || 'Unknown Shift'
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
    
    // Filter out days with no shifts and return
    return next7Days.filter(day => day.shifts.length > 0);
  };

  const getAvailabilityStatus = () => {
    const today = new Date();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    const hasTimeOff = getStaffTimeOff().some(t => {
      const startDate = new Date(t.start_date);
      const endDate = new Date(t.end_date);
      return today >= startDate && today <= endDate && t.status === 'approved';
    });

    if (hasTimeOff) {
      return { status: 'time-off', message: 'Time Off' };
    }
    if (!staffMember.availability || !staffMember.availability.includes(dayOfWeek)) {
      return { status: 'unavailable', message: 'Not Available' };
    }
    return { status: 'available', message: 'Available' };
  };

  const getAverageShiftsPerWeek = () => {
    if (!schedules || schedules.length === 0) return 0;

    let totalShifts = 0;
    let weeksCount = 0;

    schedules.forEach(schedule => {
      if (schedule.days && typeof schedule.days === 'object') {
        let weekShifts = 0;
        
        Object.keys(schedule.days).forEach(day => {
          if (day !== 'week_key' && Array.isArray(schedule.days[day])) {
            schedule.days[day].forEach(shift => {
              if (shift.assigned_staff && shift.assigned_staff.id === staffMember.id) {
                weekShifts++;
              }
            });
          }
        });
        
        if (weekShifts > 0) {
          totalShifts += weekShifts;
          weeksCount++;
        }
      }
    });

    return weeksCount > 0 ? Math.round((totalShifts / weeksCount) * 10) / 10 : 0;
  };

  if (!staffMember) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {user ? 'No staff record found' : 'Loading your dashboard...'}
          </Typography>
          {user && (
            <Typography variant="body2" color="text.secondary">
              Your user account is not linked to a staff record. Please contact your manager to link your account.
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  const availabilityStatus = getAvailabilityStatus();
  const next7DaysShifts = getNext7DaysShifts();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome, {staffMember.name}!
      </Typography>
      
      <Grid container spacing={3}>
        {/* Personal Info Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Personal Information
                </Typography>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={handleEditInfo}
                  variant="outlined"
                >
                  Edit
                </Button>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Email:</strong> {staffMember.email || 'Not set'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Phone:</strong> {staffMember.phone || 'Not set'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Hire Date:</strong> {staffMember.hire_date ? format(new Date(staffMember.hire_date), 'MMM dd, yyyy') : 'Not set'}
                </Typography>
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
                <Typography variant="body2" gutterBottom>
                  <strong>Avg Shifts/Week:</strong> {getAverageShiftsPerWeek()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Role Summary Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Role Assignment Summary
              </Typography>
              
              {Object.keys(roleSummary).length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(roleSummary).map(([role, count]) => (
                    <Chip
                      key={role}
                      label={`${role}: ${count} times`}
                      color="primary"
                      size="small"
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No role assignments yet
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Next 7 Days Shifts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <EventIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Upcoming Shifts (Next 7 Days)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your scheduled shifts for the next 7 days
              </Typography>
              
              {next7DaysShifts.length > 0 ? (
                <Grid container spacing={2}>
                  {next7DaysShifts.map((dayInfo, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {dayInfo.dayName}, {format(dayInfo.date, 'MMM dd')}
                        </Typography>
                        {dayInfo.shifts.map((shift, shiftIndex) => (
                          <Box key={shiftIndex} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              <strong>{shift.shiftName}</strong>
                            </Typography>
                            <Typography variant="body2" color="primary">
                              Role: {shift.role}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {shift.start_time} - {shift.end_time}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No shifts scheduled for the next 7 days
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Time Off Requests */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Time Off Requests
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setTimeOffDialogOpen(true)}
                >
                  Request Time Off
                </Button>
              </Box>
              
              {getStaffTimeOff().length > 0 ? (
                <List>
                  {getStaffTimeOff().map((request) => (
                    <ListItem key={request.id}>
                      <ListItemText
                        primary={`${format(new Date(request.start_date), 'MMM dd')} - ${format(new Date(request.end_date), 'MMM dd, yyyy')}`}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Time off request
                            </Typography>
                            {request.reason && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                "{request.reason}"
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {isWithinNextTwoWeeks(request.start_date) && (
                                <Chip
                                  label="Short Notice"
                                  color="warning"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                              {isLongerThanSevenDays(request.start_date, request.end_date) && (
                                <Chip
                                  label="Long Request"
                                  color="info"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={request.status}
                            color={
                              request.status === 'approved' ? 'success' :
                              request.status === 'pending' ? 'warning' : 'error'
                            }
                            size="small"
                          />
                          {request.status === 'pending' && (
                            <IconButton
                              size="small"
                              onClick={() => handleCancelTimeOffRequest(request.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No time off requests
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Time Off Request Dialog */}
      <Dialog open={timeOffDialogOpen} onClose={() => setTimeOffDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Time Off</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {/* Guidance Messages */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                Time Off Request Guidelines:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Please request time off at least two weeks in advance
              </Typography>
              <Typography variant="body2">
                • Please communicate with a manager about large time off requests (More than seven days)
              </Typography>
            </Alert>

            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={timeOffForm.startDate}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, startDate: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={timeOffForm.endDate}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, endDate: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />

            {/* Two-week warning - appears above reason field */}
            {timeOffForm.startDate && isWithinNextTwoWeeks(timeOffForm.startDate) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  This request is in the next 2 weeks, there is a lower chance of getting approval
                </Typography>
              </Alert>
            )}

            <TextField
              fullWidth
              label="Reason (Optional)"
              value={timeOffForm.reason}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              placeholder="Please provide a reason for your time off request..."
            />

            {/* Other Dynamic Warnings */}

            {timeOffForm.startDate && timeOffForm.endDate && isLongerThanSevenDays(timeOffForm.startDate, timeOffForm.endDate) && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  This is a large time off request (more than 7 days). Please communicate with a manager.
                </Typography>
              </Alert>
            )}

            {timeOffForm.startDate && timeOffForm.endDate && (() => {
              const overlappingRequests = getOverlappingRequests(timeOffForm.startDate, timeOffForm.endDate);
              if (overlappingRequests.length >= 2) {
                const overlappingNames = overlappingRequests.map(req => {
                  const staffMember = staff.find(s => s.id === req.staff_id);
                  return staffMember ? staffMember.name : 'Unknown';
                }).join(', ');
                
                return (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      CONFLICT: {overlappingRequests.length} other employee(s) have requested time off during this period: {overlappingNames}
                    </Typography>
                  </Alert>
                );
              }
              return null;
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimeOffDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTimeOffSubmit} variant="contained">
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Information Dialog */}
      <Dialog open={editInfoDialogOpen} onClose={() => setEditInfoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Personal Information</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditInfoDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditInfoSubmit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StaffDashboard;
