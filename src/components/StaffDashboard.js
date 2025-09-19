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
  MenuItem,
  useMediaQuery,
  useTheme,
  Stack,
  Divider
} from '@mui/material';
import {
  Event as EventIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwapHoriz as SwapIcon,
  HelpOutline as CoverIcon,
  HelpOutline
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { timeOffHelpers, staffHelpers, scheduleHelpers } from '../lib/supabaseHelpers';
import { format, startOfWeek, addDays } from 'date-fns';

function StaffDashboard() {
  const { user, getStaffMember } = useAuth();
  const { timeOffRequests, roles, schedules, staff, shifts } = useData();
  const [staffMember, setStaffMember] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [offerCoverageDialogOpen, setOfferCoverageDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [swapForm, setSwapForm] = useState({
    reason: '',
    preferredStaff: ''
  });
  const [coverForm, setCoverForm] = useState({
    reason: ''
  });
  const [offerCoverageForm, setOfferCoverageForm] = useState({
    date: '',
    message: ''
  });
  const [coverageRequests, setCoverageRequests] = useState([]);
  const [coverageOffers, setCoverageOffers] = useState([]);

  // Helper function to check if a request has expired
  const isRequestExpired = (request) => {
    const today = new Date();
    const requestDate = new Date(request.date);
    
    // Set to end of day for comparison
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    return requestDate < endOfToday;
  };

  // Helper function to get active (non-expired) requests
  const getActiveRequests = () => {
    return coverageRequests.filter(request => 
      !isRequestExpired(request) && request.status === 'pending'
    );
  };

  // Helper function to calculate current week shifts for a staff member
  const getCurrentWeekShifts = (staffId, targetDate) => {
    if (!schedules || !staffId || !targetDate) return 0;
    
    // Get the week start for the target date
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = addDays(weekStart, 6); // Sunday
    
    let currentWeekShifts = 0;
    
    // Count shifts across all schedules for this week
    schedules.forEach(schedule => {
      if (schedule.days && typeof schedule.days === 'object') {
        Object.keys(schedule.days).forEach(dayKey => {
          // Skip metadata keys
          if (dayKey === 'week_key' || dayKey === 'week_start') return;
          
          const dayDate = new Date(dayKey);
          // Check if this day is within the target week
          if (dayDate >= weekStart && dayDate <= weekEnd) {
            const dayData = schedule.days[dayKey];
            if (dayData && dayData.shifts && Array.isArray(dayData.shifts)) {
              dayData.shifts.forEach(shift => {
                if (shift.assignedStaff) {
                  // Check if this staff member is assigned to any role in this shift
                  const isAssigned = Object.values(shift.assignedStaff).includes(staffId);
                  if (isAssigned) {
                    currentWeekShifts++;
                  }
                }
              });
            }
          }
        });
      }
    });
    
    return currentWeekShifts;
  };

  // Helper function to check if staff member is already scheduled on a given date
  const isStaffScheduledOnDate = (staffId, date) => {
    if (!schedules || !staffId || !date) return false;
    
    const dateString = format(date, 'yyyy-MM-dd');
    
    return schedules.some(schedule => {
      if (schedule.days && typeof schedule.days === 'object') {
        const dayData = schedule.days[dateString];
        if (dayData && dayData.shifts && Array.isArray(dayData.shifts)) {
          return dayData.shifts.some(shift => {
            if (shift.assignedStaff) {
              return Object.values(shift.assignedStaff).includes(staffId);
            }
            return false;
          });
        }
      }
      return false;
    });
  };

  // Helper function to check if staff member is qualified for a role
  const isStaffQualifiedForRole = (staffId, roleName) => {
    if (!staff || !staffId || !roleName) return false;
    
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember || !staffMember.roles) return false;
    
    return staffMember.roles.includes(roleName);
  };

  const handleAcceptRequest = async (requestId) => {
    const request = coverageRequests.find(r => r.id === requestId);
    if (!request) return;

    // For COVER requests: Check if current staff member is already scheduled on that date
    if (request.type === 'cover' && isStaffScheduledOnDate(staffMember.id, request.date)) {
      alert(`You are already scheduled on ${format(request.date, 'MMM dd, yyyy')}. You cannot cover this shift.`);
      return;
    }

    // For SWAP requests: Check if current staff member is NOT scheduled on that date
    if (request.type === 'swap' && !isStaffScheduledOnDate(staffMember.id, request.date)) {
      alert(`You are not scheduled on ${format(request.date, 'MMM dd, yyyy')}. You can only swap shifts you are already assigned to.`);
      return;
    }

    // Check if current staff member is qualified for the role
    if (!isStaffQualifiedForRole(staffMember.id, request.role)) {
      alert(`You are not qualified for the role "${request.role}". You cannot ${request.type === 'cover' ? 'cover' : 'swap'} this shift.`);
      return;
    }

    // For COVER requests: Check if accepting would exceed target shifts for the week
    // Note: Swaps are 1:1 exchanges on the same day, so no target shifts check needed
    if (request.type === 'cover') {
      const currentWeekShifts = getCurrentWeekShifts(staffMember.id, request.date);
      const targetShifts = staffMember.target_shifts || staffMember.targetShifts || 5;
      
      if (currentWeekShifts >= targetShifts) {
        alert(`You have already reached your target shifts for this week (${currentWeekShifts}/${targetShifts}). You cannot cover additional shifts.`);
        return;
      }
    }
    
    // For SWAP requests: No target shifts check needed since it's a 1:1 exchange
    // Both staff members keep the same total number of shifts for the week

    try {
      if (request.type === 'swap') {
        // For swaps, we need to find both shifts and swap the assignments
        await handleShiftSwap(request);
      } else {
        // For covers, we need to assign the current staff member to the shift
        await handleShiftCover(request);
      }

      // Update the request status
      setCoverageRequests(prev => 
        prev.map(r => 
          r.id === requestId 
            ? { ...r, status: 'accepted', acceptedBy: staffMember.name }
            : r
        )
      );

      const actionText = request.type === 'cover' ? 'cover' : 'swap';
      alert(`You have accepted the ${request.type} request for ${request.shiftName} on ${format(request.date, 'MMM dd, yyyy')}. The schedule has been updated.`);
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating shift assignment:', error);
      alert('Error updating shift assignment. Please try again.');
    }
  };

  const handleDeclineRequest = (requestId) => {
    setCoverageRequests(prev => 
      prev.map(r => 
        r.id === requestId 
          ? { ...r, status: 'declined' }
          : r
      )
    );
  };

  const handleShiftSwap = async (request) => {
    // Find the requester's shift on the same date
    const requesterShift = findStaffShiftOnDate(request.requesterId, request.date);
    if (!requesterShift) {
      throw new Error('Could not find requester\'s shift to swap');
    }

    // Find the current staff member's shift on the same date
    const currentStaffShift = findStaffShiftOnDate(staffMember.id, request.date);
    if (!currentStaffShift) {
      throw new Error('Could not find your shift to swap');
    }

    // Get the date string for the database
    const dateString = format(request.date, 'yyyy-MM-dd');

    // Call the database function to swap shifts
    await scheduleHelpers.swapShifts(
      requesterShift.scheduleId,
      dateString,
      requesterShift.id,
      requesterShift.roleId,
      currentStaffShift.id,
      currentStaffShift.roleId,
      request.requesterId,
      staffMember.id
    );
  };

  const handleShiftCover = async (request) => {
    // Find the shift that needs coverage
    const shiftToCover = findShiftById(request.shiftId, request.date);
    if (!shiftToCover) {
      throw new Error('Could not find shift to cover');
    }

    // Find the role ID for the role name
    const role = roles.find(r => r.name === request.role);
    if (!role) {
      throw new Error('Could not find role information');
    }

    // Get the date string for the database
    const dateString = format(request.date, 'yyyy-MM-dd');

    // Call the database function to cover the shift
    await scheduleHelpers.coverShift(
      shiftToCover.scheduleId,
      dateString,
      request.shiftId,
      role.id,
      staffMember.id
    );
  };

  const findStaffShiftOnDate = (staffId, date) => {
    if (!schedules || !staffId || !date) return null;
    
    const dateString = format(date, 'yyyy-MM-dd');
    
    for (const schedule of schedules) {
      if (schedule.days && typeof schedule.days === 'object') {
        const dayData = schedule.days[dateString];
        if (dayData && dayData.shifts && Array.isArray(dayData.shifts)) {
          for (const shift of dayData.shifts) {
            if (shift.assignedStaff) {
              const assignedRoleId = Object.keys(shift.assignedStaff).find(roleId => 
                shift.assignedStaff[roleId] === staffId
              );
              if (assignedRoleId) {
                return { ...shift, roleId: assignedRoleId, scheduleId: schedule.id };
              }
            }
          }
        }
      }
    }
    return null;
  };

  const findShiftById = (shiftId, date) => {
    if (!schedules || !shiftId || !date) return null;
    
    const dateString = format(date, 'yyyy-MM-dd');
    
    for (const schedule of schedules) {
      if (schedule.days && typeof schedule.days === 'object') {
        const dayData = schedule.days[dateString];
        if (dayData && dayData.shifts && Array.isArray(dayData.shifts)) {
          const shift = dayData.shifts.find(s => s.id === shiftId);
          if (shift) {
            return { ...shift, scheduleId: schedule.id };
          }
        }
      }
    }
    return null;
  };

  useEffect(() => {
    const loadStaffData = async () => {
      if (user) {
        const staff = await getStaffMember();
        setStaffMember(staff);
        if (staff) {
          // Staff data loaded
        }
      }
    };
    loadStaffData();
  }, [user]);

  // Clean up expired requests periodically
  useEffect(() => {
    const cleanupExpiredRequests = () => {
      setCoverageRequests(prev => 
        prev.filter(request => !isRequestExpired(request))
      );
    };

    // Clean up immediately
    cleanupExpiredRequests();

    // Set up interval to clean up every hour
    const interval = setInterval(cleanupExpiredRequests, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);


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

  const handleSwapClick = (shift, dayInfo) => {
    setSelectedShift({ ...shift, date: dayInfo.date });
    setSwapForm({ reason: '', preferredStaff: '' });
    setSwapDialogOpen(true);
  };

  const handleCoverClick = (shift, dayInfo) => {
    setSelectedShift({ ...shift, date: dayInfo.date });
    setCoverForm({ reason: '' });
    setCoverDialogOpen(true);
  };

  const handleSwapSubmit = async () => {
    try {
      // For now, just show a success message and add to local state
      // TODO: Implement actual database submission
      const newSwapRequest = {
        id: Date.now(), // Temporary ID
        requester: staffMember.name,
        requesterId: staffMember.id,
        shiftName: selectedShift.shiftName,
        shiftId: selectedShift.id,
        role: selectedShift.role,
        date: selectedShift.date,
        time: selectedShift.start_time,
        reason: swapForm.reason,
        preferredStaff: swapForm.preferredStaff,
        status: 'pending',
        type: 'swap',
        createdAt: new Date()
      };
      
      setCoverageRequests(prev => [newSwapRequest, ...prev]);
      
      setSwapDialogOpen(false);
      setSwapForm({ reason: '', preferredStaff: '' });
      setSelectedShift(null);
      
      alert('Swap request submitted! You will be notified when someone responds.');
    } catch (error) {
      console.error('Error submitting swap request:', error);
      alert('Error submitting swap request. Please try again.');
    }
  };

  const handleCoverSubmit = async () => {
    try {
      // For now, just show a success message and add to local state
      // TODO: Implement actual database submission
      const newCoverRequest = {
        id: Date.now(), // Temporary ID
        requester: staffMember.name,
        requesterId: staffMember.id,
        shiftName: selectedShift.shiftName,
        shiftId: selectedShift.id,
        role: selectedShift.role,
        date: selectedShift.date,
        time: selectedShift.start_time,
        reason: coverForm.reason,
        status: 'pending',
        type: 'cover',
        createdAt: new Date()
      };
      
      setCoverageRequests(prev => [newCoverRequest, ...prev]);
      
      setCoverDialogOpen(false);
      setCoverForm({ reason: '' });
      setSelectedShift(null);
      
      alert('Cover request submitted! Your manager will be notified.');
    } catch (error) {
      console.error('Error submitting cover request:', error);
      alert('Error submitting cover request. Please try again.');
    }
  };

  const handleOfferCoverageClick = () => {
    setOfferCoverageForm({ date: '', message: '' });
    setOfferCoverageDialogOpen(true);
  };

  const handleOfferCoverageSubmit = async () => {
    try {
      if (!offerCoverageForm.date || !offerCoverageForm.message.trim()) {
        alert('Please select a date and enter a message.');
        return;
      }

      const newCoverageOffer = {
        id: Date.now(), // Temporary ID
        offerer: staffMember.name,
        offererId: staffMember.id,
        date: new Date(offerCoverageForm.date),
        message: offerCoverageForm.message.trim(),
        status: 'active',
        type: 'offer',
        createdAt: new Date()
      };
      
      setCoverageOffers(prev => [newCoverageOffer, ...prev]);
      
      setOfferCoverageDialogOpen(false);
      setOfferCoverageForm({ date: '', message: '' });
      
      alert(`Coverage offer submitted for ${format(new Date(offerCoverageForm.date), 'EEEE, MMM d, yyyy')}!`);
    } catch (error) {
      console.error('Error submitting coverage offer:', error);
      alert('Error submitting coverage offer. Please try again.');
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
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    return timeOffRequests.filter(t => {
      // Only show requests for this staff member
      if (t.staff_id !== staffMember.id) return false;
      
      // Filter out expired requests (end date is before today)
      const endDate = new Date(t.end_date);
      endDate.setHours(0, 0, 0, 0);
      
      return endDate >= today;
    });
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
    // Safety check - return empty array if required data is not loaded
    if (!schedules || !shifts || !roles || !staffMember) {
      return [];
    }
    
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
              const assignedRoleId = shift.assignedStaff ? 
                Object.keys(shift.assignedStaff).find(roleId => 
                  shift.assignedStaff[roleId] === staffMember.id
                ) : null;
              
              if (assignedRoleId) {
                // Find the matching day in our next 7 days
                const dayInfo = next7Days.find(day => day.dateString === dayKey);
                if (dayInfo) {
                  // Check if this shift is already added to avoid duplicates
                  const shiftAlreadyExists = dayInfo.shifts.some(existingShift => 
                    existingShift.id === shift.id && existingShift.shiftId === shift.shiftId
                  );
                  
                  if (!shiftAlreadyExists) {
                    // Get the role name for this staff member
                    const role = roles.find(r => r.id === assignedRoleId);
                    const roleName = role ? role.name : 'Unassigned';
                    
                    // Get shift template info
                    const shiftTemplate = shifts && shifts.length > 0 ? shifts.find(s => s.id === shift.shiftId) : null;
                    const startTime = shiftTemplate ? shiftTemplate.start_time : 'TBD';
                    
                    // Use arrivalTime from shift data if available, otherwise use shift template times
                    const arrivalTime = shift.arrivalTime || startTime;
                    
                    dayInfo.shifts.push({
                      ...shift,
                      role: roleName,
                      start_time: arrivalTime,
                      shiftName: shiftTemplate ? shiftTemplate.name : shift.name || 'Unknown Shift'
                    });
                  }
                }
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
      <Typography variant={isMobile ? "h5" : "h4"} gutterBottom sx={{ textAlign: isMobile ? 'center' : 'left' }}>
        Welcome, {staffMember.name}!
      </Typography>
      
      <Grid container spacing={isMobile ? 2 : 3}>
        {/* Personal Info Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center', 
                mb: 2,
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 1 : 0
              }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"}>
                  <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {isMobile ? "Info" : "Personal Information"}
                </Typography>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={handleEditInfo}
                  variant="outlined"
                  sx={{ alignSelf: isMobile ? 'flex-start' : 'auto' }}
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

        {/* Time Off Requests */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: isMobile ? 'flex-start' : 'center', 
                mb: 2,
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 1 : 0
              }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"}>
                  Time Off Requests
              </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setTimeOffDialogOpen(true)}
                  size={isMobile ? "small" : "medium"}
                  sx={{ alignSelf: isMobile ? 'flex-start' : 'auto' }}
                >
                  {isMobile ? "Request" : "Request Time Off"}
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

        {/* Next 7 Days Shifts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                <EventIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {isMobile ? "Upcoming Shifts" : "Upcoming Shifts (Next 7 Days)"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: isMobile ? 'center' : 'left' }}>
                {isMobile ? "Next 7 days" : "Your scheduled shifts for the next 7 days"}
              </Typography>
              
              {next7DaysShifts.length > 0 ? (
                <Grid container spacing={isMobile ? 1 : 2}>
                  {next7DaysShifts.map((dayInfo, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Box sx={{ 
                        p: isMobile ? 1.5 : 2, 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 1,
                        bgcolor: 'background.paper'
                      }}>
                        <Typography variant={isMobile ? "body2" : "subtitle2"} gutterBottom sx={{ fontWeight: 'medium' }}>
                          {dayInfo.dayName}, {format(dayInfo.date, 'MMM dd')}
                        </Typography>
                        {dayInfo.shifts.map((shift, shiftIndex) => (
                          <Box key={shiftIndex} sx={{ mb: isMobile ? 0.5 : 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant={isMobile ? "caption" : "body2"} sx={{ fontWeight: 'medium' }}>
                                  {shift.shiftName}
                            </Typography>
                                <Typography variant={isMobile ? "caption" : "body2"} color="primary" sx={{ display: 'block' }}>
                                  {shift.role}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                                  {shift.start_time}
                            </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleSwapClick(shift, dayInfo)}
                                  sx={{ 
                                    p: 0.5,
                                    color: 'primary.main',
                                    '&:hover': { bgcolor: 'primary.light', color: 'white' }
                                  }}
                                  title="Request Swap"
                                >
                                  <SwapIcon sx={{ fontSize: isMobile ? '0.8rem' : '1rem' }} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleCoverClick(shift, dayInfo)}
                                  sx={{ 
                                    p: 0.5,
                                    color: 'warning.main',
                                    '&:hover': { bgcolor: 'warning.light', color: 'white' }
                                  }}
                                  title="Request Coverage"
                                >
                                  <CoverIcon sx={{ fontSize: isMobile ? '0.8rem' : '1rem' }} />
                                </IconButton>
                              </Box>
                            </Box>
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

        {/* Coverage Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
               <Box sx={{ 
                 display: 'flex', 
                 justifyContent: 'space-between', 
                 alignItems: isMobile ? 'flex-start' : 'center', 
                 mb: 2,
                 flexDirection: isMobile ? 'column' : 'row',
                 gap: isMobile ? 1 : 0
               }}>
                 <Box>
                   <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                     <HelpOutline sx={{ mr: 1, verticalAlign: 'middle' }} />
                     {isMobile ? "Coverage" : "Coverage Requests"}
                </Typography>
                   <Typography variant="body2" color="text.secondary" sx={{ textAlign: isMobile ? 'center' : 'left' }}>
                     {isMobile ? "Help with shifts" : "Cover requests (cover for someone) and Swap requests (trade shifts)"}
                   </Typography>
                 </Box>
                <Button
                   size="small"
                  startIcon={<AddIcon />}
                   onClick={handleOfferCoverageClick}
                   variant="contained"
                   sx={{ alignSelf: isMobile ? 'flex-start' : 'auto' }}
                >
                   {isMobile ? "Offer" : "Offer Coverage"}
                </Button>
              </Box>
              
              {(getActiveRequests().length > 0 || coverageOffers.length > 0) ? (
                <Grid container spacing={isMobile ? 1 : 2}>
                  {getActiveRequests().map((request) => (
                    <Grid item xs={12} sm={6} md={4} key={request.id}>
                      <Box sx={{ 
                        p: isMobile ? 1.5 : 2, 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 1,
                        bgcolor: 'background.paper'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant={isMobile ? "body2" : "subtitle2"} sx={{ fontWeight: 'medium' }}>
                              {request.shiftName}
                            </Typography>
                            <Typography variant={isMobile ? "caption" : "body2"} color="primary">
                              {request.role}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {format(request.date, 'MMM dd')} at {request.time}
                            </Typography>
                            {/* Show expiration warning if request is today */}
                            {(() => {
                              const today = new Date();
                              const requestDate = new Date(request.date);
                              const isToday = requestDate.toDateString() === today.toDateString();
                              const isTomorrow = requestDate.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();
                              
                              if (isToday) {
                                return (
                                  <Typography variant="caption" color="error" sx={{ display: 'block', fontWeight: 'medium' }}>
                                    ⚠️ Expires today!
                                  </Typography>
                                );
                              } else if (isTomorrow) {
                                return (
                                  <Typography variant="caption" color="warning.main" sx={{ display: 'block', fontWeight: 'medium' }}>
                                    ⏰ Expires tomorrow
                                  </Typography>
                                );
                              }
                              return null;
                            })()}
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                            <Chip 
                              label={request.type === 'cover' ? 'Cover' : 'Swap'} 
                            size="small"
                              color={request.type === 'cover' ? 'warning' : 'primary'}
                            />
                            {/* Show days until expiration */}
                            {(() => {
                              const today = new Date();
                              const requestDate = new Date(request.date);
                              const daysUntil = Math.ceil((requestDate - today) / (1000 * 60 * 60 * 24));
                              
                              if (daysUntil === 0) {
                                return (
                                  <Typography variant="caption" color="error" sx={{ fontSize: '0.65rem' }}>
                                    Today
                                  </Typography>
                                );
                              } else if (daysUntil === 1) {
                                return (
                                  <Typography variant="caption" color="warning.main" sx={{ fontSize: '0.65rem' }}>
                                    Tomorrow
                                  </Typography>
                                );
                              } else if (daysUntil <= 3) {
                                return (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                    {daysUntil} days
                                  </Typography>
                                );
                              }
                              return null;
                            })()}
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Requested by: {request.requester}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Reason: {request.reason}
                        </Typography>
                        
                        {request.status === 'pending' ? (
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button 
                              size="small"
                              variant="contained" 
                              color="success"
                              onClick={() => handleAcceptRequest(request.id)}
                            >
                              Accept
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="error"
                              onClick={() => handleDeclineRequest(request.id)}
                            >
                              Decline
                            </Button>
                        </Box>
                        ) : request.status === 'accepted' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Chip 
                              label={`Accepted by ${request.acceptedBy}`} 
                              size="small" 
                              color="success" 
                              variant="outlined"
                            />
                          </Box>
                        ) : request.status === 'declined' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Chip 
                              label="Declined" 
                              size="small" 
                              color="error" 
                              variant="outlined"
                            />
                          </Box>
                        ) : null}
                      </Box>
                    </Grid>
                  ))}
                  
                  {/* Coverage Offers */}
                  {coverageOffers.map((offer) => (
                    <Grid item xs={12} sm={6} md={4} key={offer.id}>
                      <Box sx={{ 
                        p: isMobile ? 1.5 : 2, 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 1,
                        bgcolor: 'background.paper'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant={isMobile ? "body2" : "subtitle2"} sx={{ fontWeight: 'medium' }}>
                              Coverage Available
                            </Typography>
                            <Typography variant={isMobile ? "caption" : "body2"} color="success.main">
                              {format(offer.date, 'MMM dd')} - {offer.offerer}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {offer.message}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                            <Chip 
                              label="Offer" 
                              size="small" 
                              color="success"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          Posted: {format(offer.createdAt, 'MMM dd, h:mm a')}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ 
                  p: 2, 
                  border: '1px dashed #e0e0e0', 
                  borderRadius: 1,
                  textAlign: 'center',
                  bgcolor: 'background.paper'
                }}>
                <Typography variant="body2" color="text.secondary">
                    No active coverage requests
                </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    When staff request coverage for their shifts, they will appear here. Requests expire after the shift date passes.
                  </Typography>
                </Box>
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

      {/* Swap Request Dialog */}
      <Dialog open={swapDialogOpen} onClose={() => setSwapDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Shift Swap</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {selectedShift && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  Swap Request for:
                </Typography>
                <Typography variant="body2">
                  <strong>{selectedShift.shiftName}</strong> - {selectedShift.role}
                </Typography>
                <Typography variant="body2">
                  {format(selectedShift.date, 'EEEE, MMMM d, yyyy')} at {selectedShift.start_time}
                </Typography>
              </Alert>
            )}

            <TextField
              fullWidth
              label="Reason for Swap"
              value={swapForm.reason}
              onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              placeholder="Please explain why you need to swap this shift..."
              required
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Preferred Staff Member (Optional)</InputLabel>
              <Select
                value={swapForm.preferredStaff}
                onChange={(e) => setSwapForm({ ...swapForm, preferredStaff: e.target.value })}
                label="Preferred Staff Member (Optional)"
              >
                <MenuItem value="">
                  <em>No preference</em>
                </MenuItem>
                {staff && staff.map((staffMember) => (
                  <MenuItem key={staffMember.id} value={staffMember.id}>
                    {staffMember.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                Swap vs Cover:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • <strong>Swap:</strong> Trade your shift with someone else (both of you work, just different shifts)
              </Typography>
              <Typography variant="body2">
                • <strong>Cover:</strong> Someone covers your shift (you get the day off, they work)
              </Typography>
            </Alert>
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                This swap request will be sent to staff who are already scheduled on this date. You will be notified when someone accepts your request.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSwapDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSwapSubmit} variant="contained" disabled={!swapForm.reason.trim()}>
            Submit Swap Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cover Request Dialog */}
      <Dialog open={coverDialogOpen} onClose={() => setCoverDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Coverage</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {selectedShift && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                  Coverage Request for:
                </Typography>
                <Typography variant="body2">
                  <strong>{selectedShift.shiftName}</strong> - {selectedShift.role}
                </Typography>
                <Typography variant="body2">
                  {format(selectedShift.date, 'EEEE, MMMM d, yyyy')} at {selectedShift.start_time}
                </Typography>
              </Alert>
            )}

            <TextField
              fullWidth
              label="Reason for Coverage"
              value={coverForm.reason}
              onChange={(e) => setCoverForm({ ...coverForm, reason: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              placeholder="Please explain why you need coverage for this shift..."
              required
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                Cover Request:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Someone will cover your shift (you get the day off, they work)
              </Typography>
              <Typography variant="body2">
                • This request will be sent to your manager and all available staff members
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCoverDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCoverSubmit} variant="contained" disabled={!coverForm.reason.trim()}>
            Submit Coverage Request
          </Button>
         </DialogActions>
       </Dialog>

       {/* Offer Coverage Dialog */}
       <Dialog open={offerCoverageDialogOpen} onClose={() => setOfferCoverageDialogOpen(false)} maxWidth="sm" fullWidth>
         <DialogTitle>Offer Coverage</DialogTitle>
         <DialogContent>
           <Box sx={{ pt: 1 }}>
             <Alert severity="info" sx={{ mb: 2 }}>
               <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                 Coverage Offer:
               </Typography>
               <Typography variant="body2" sx={{ mb: 1 }}>
                 • Let your team know you're available to cover shifts
               </Typography>
               <Typography variant="body2">
                 • This will be visible to all staff members
               </Typography>
             </Alert>

             <TextField
               fullWidth
               label="Date Available"
               type="date"
               value={offerCoverageForm.date}
               onChange={(e) => setOfferCoverageForm({ ...offerCoverageForm, date: e.target.value })}
               margin="normal"
               InputLabelProps={{ shrink: true }}
               required
             />

             <TextField
               fullWidth
               label="Message (Optional)"
               value={offerCoverageForm.message}
               onChange={(e) => setOfferCoverageForm({ ...offerCoverageForm, message: e.target.value })}
               margin="normal"
               multiline
               rows={3}
               placeholder="Let your team know when you're available or any specific details..."
             />
           </Box>
         </DialogContent>
         <DialogActions>
           <Button onClick={() => setOfferCoverageDialogOpen(false)}>Cancel</Button>
           <Button onClick={handleOfferCoverageSubmit} variant="contained" disabled={!offerCoverageForm.date}>
             Submit Offer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StaffDashboard;
