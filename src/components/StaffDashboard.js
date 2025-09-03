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
import { timeOffHelpers, roleAssignmentsHelpers } from '../lib/supabaseHelpers';
import { format, startOfWeek, addDays } from 'date-fns';

function StaffDashboard() {
  const { user, getStaffMember } = useAuth();
  const { timeOffRequests, roles, schedules } = useData();
  const [staffMember, setStaffMember] = useState(null);
  const [timeOffDialogOpen, setTimeOffDialogOpen] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'vacation'
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
  }, [user, getStaffMember]);

  const loadRoleAssignments = async () => {
    try {
      const assignments = await roleAssignmentsHelpers.getByStaff(staffMember.id);
      setRoleAssignments(assignments);
    } catch (error) {
      console.error('Error loading role assignments:', error);
    }
  };

  const loadRoleSummary = async () => {
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
        type: timeOffForm.type,
        status: 'pending'
      });

      setTimeOffDialogOpen(false);
      setTimeOffForm({
        startDate: '',
        endDate: '',
        reason: '',
        type: 'vacation'
      });
      
      // Refresh data
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error submitting time off request:', error);
      alert('Error submitting time off request. Please try again.');
    }
  };

  const getStaffTimeOff = () => {
    return timeOffRequests.filter(t => t.staff_id === staffMember.id);
  };

  const getCurrentWeekSchedule = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    const weekSchedule = schedules.find(s => 
      s.days && s.days.week_key === weekKey
    );
    
    if (!weekSchedule) return null;
    
    // Filter to show only this staff member's assignments
    const staffAssignments = {};
    Object.keys(weekSchedule.days).forEach(day => {
      if (day !== 'week_key' && weekSchedule.days[day]) {
        weekSchedule.days[day].forEach(shift => {
          if (shift.assigned_staff && shift.assigned_staff.id === staffMember.id) {
            if (!staffAssignments[day]) staffAssignments[day] = [];
            staffAssignments[day].push({
              ...shift,
              role: shift.role || 'Unassigned'
            });
          }
        });
      }
    });
    
    return staffAssignments;
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

  if (!staffMember) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography variant="h6" color="text.secondary">
          Loading your dashboard...
        </Typography>
      </Box>
    );
  }

  const availabilityStatus = getAvailabilityStatus();
  const currentWeekSchedule = getCurrentWeekSchedule();

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
              <Typography variant="h6" gutterBottom>
                <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Personal Information
              </Typography>
              
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

        {/* Current Week Schedule */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <EventIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                This Week's Schedule
              </Typography>
              
              {currentWeekSchedule && Object.keys(currentWeekSchedule).length > 0 ? (
                <Grid container spacing={2}>
                  {Object.entries(currentWeekSchedule).map(([day, shifts]) => (
                    <Grid item xs={12} sm={6} md={4} key={day}>
                      <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {day}
                        </Typography>
                        {shifts.map((shift, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              <strong>{shift.role}</strong>
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
                  No assignments for this week
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
                        secondary={`${request.reason} (${request.type})`}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={request.status}
                          color={
                            request.status === 'approved' ? 'success' :
                            request.status === 'pending' ? 'warning' : 'error'
                          }
                          size="small"
                        />
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
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                value={timeOffForm.type}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, type: e.target.value })}
                label="Type"
              >
                <MenuItem value="vacation">Vacation</MenuItem>
                <MenuItem value="sick">Sick Leave</MenuItem>
                <MenuItem value="personal">Personal</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Reason"
              multiline
              rows={3}
              value={timeOffForm.reason}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
              margin="normal"
              required
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
    </Box>
  );
}

export default StaffDashboard;
