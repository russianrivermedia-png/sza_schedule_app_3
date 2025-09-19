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
  TextField,
  Typography,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  ViewList as ListIcon,
  CalendarMonth as CalendarMonthIcon,
  CheckCircle as ApproveIcon,
  Cancel as DenyIcon,
} from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { format, isAfter, isBefore, addDays, differenceInDays } from 'date-fns';
import { useData } from '../context/DataContext';
import { timeOffHelpers } from '../lib/supabaseHelpers';

function TimeOffRequestsTab() {
  const { timeOffRequests, staff, roles, dispatch } = useData();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeOffForm, setTimeOffForm] = useState({
    staffId: '',
    startDate: '',
    endDate: '',
    reason: '',
    preApprove: false,
  });

  // Helper functions for time off requests
  const isRequestPast = (request) => {
    const endDate = new Date(request.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  };

  const isRequestFuture = (request) => {
    const startDate = new Date(request.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return startDate > today;
  };

  const isRequestCurrent = (request) => {
    return !isRequestPast(request) && !isRequestFuture(request);
  };

  const isWithinNextTwoWeeks = (startDate) => {
    const requestDate = new Date(startDate);
    const today = new Date();
    const twoWeeksFromNow = addDays(today, 14);
    return requestDate >= today && requestDate <= twoWeeksFromNow;
  };

  const isLongerThanSevenDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return differenceInDays(end, start) > 7;
  };

  const getOverlappingRequests = (startDate, endDate, excludeRequestId = null) => {
    const requestStart = new Date(startDate);
    const requestEnd = new Date(endDate);
    
    return timeOffRequests.filter(request => {
      if (excludeRequestId && request.id === excludeRequestId) return false;
      
      const existingStart = new Date(request.start_date);
      const existingEnd = new Date(request.end_date);
      
      // Check if dates overlap
      return (requestStart <= existingEnd && requestEnd >= existingStart);
    });
  };

  const getStaffName = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? staffMember.name : 'Unknown';
  };

  // Calendar view helper functions
  const getStaffColor = (staffId) => {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return '#757575';
    
    // Use staff color if available, otherwise generate a color based on name
    if (staffMember.color) return staffMember.color;
    
    // Generate a consistent color based on staff name
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
    const index = staffMember.name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getRequestsForDate = (date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return timeOffRequests.filter(request => {
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return targetDate >= startDate && targetDate <= endDate;
    });
  };

  const getRequestsForMonth = (date) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    
    return timeOffRequests.filter(request => {
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      
      // Check if request overlaps with the month
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      return (startDate <= monthEnd && endDate >= monthStart);
    });
  };

  // Helper function to get highlighting info for a specific date
  const getDateHighlightInfo = (date) => {
    const requests = getRequestsForDate(date);
    if (requests.length === 0) return null;

    const approvedCount = requests.filter(r => r.status === 'approved').length;
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const totalCount = requests.length;

    return {
      hasRequests: true,
      approvedCount,
      pendingCount,
      totalCount,
      // Color priority: if any approved, use approved color, otherwise pending
      isApproved: approvedCount > 0,
      isMixed: approvedCount > 0 && pendingCount > 0
    };
  };

  const handleOpenDialog = (request = null) => {
    if (request) {
      setEditingRequest(request);
      setTimeOffForm({
        staffId: request.staff_id,
        startDate: request.start_date,
        endDate: request.end_date,
        reason: request.reason || '',
        preApprove: false,
      });
    } else {
      setEditingRequest(null);
      setTimeOffForm({
        staffId: '',
        startDate: '',
        endDate: '',
        reason: '',
        preApprove: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRequest(null);
    setTimeOffForm({
      staffId: '',
      startDate: '',
      endDate: '',
      reason: '',
      preApprove: false,
    });
  };

  const handleSubmit = async () => {
    if (!timeOffForm.staffId || !timeOffForm.startDate || !timeOffForm.endDate) return;

    try {
      const requestData = {
        staff_id: timeOffForm.staffId,
        start_date: timeOffForm.startDate,
        end_date: timeOffForm.endDate,
        reason: timeOffForm.reason || null,
        status: timeOffForm.preApprove ? 'approved' : 'pending',
      };

      if (editingRequest) {
        const updatedRequest = await timeOffHelpers.update(editingRequest.id, requestData);
        dispatch({ type: 'UPDATE_TIME_OFF_REQUEST', payload: updatedRequest });
      } else {
        const newRequest = await timeOffHelpers.add(requestData);
        dispatch({ type: 'ADD_TIME_OFF_REQUEST', payload: newRequest });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving time off request:', error);
      alert(`Error saving time off request: ${error.message}`);
    }
  };


  const handleDelete = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this time off request?')) return;
    
    try {
      await timeOffHelpers.delete(requestId);
      dispatch({ type: 'DELETE_TIME_OFF_REQUEST', payload: requestId });
    } catch (error) {
      console.error('Error deleting time off request:', error);
      alert(`Error deleting request: ${error.message}`);
    }
  };

  const handleApprove = async (requestId) => {
    console.log('🟢 APPROVING REQUEST:', requestId);
    try {
      const result = await timeOffHelpers.update(requestId, { status: 'approved' });
      console.log('✅ APPROVE SUCCESS:', result);
      dispatch({ type: 'UPDATE_TIME_OFF_REQUEST', payload: result });
    } catch (error) {
      console.error('❌ APPROVE ERROR:', error);
      alert(`Error approving request: ${error.message}`);
    }
  };

  const handleDeny = async (requestId) => {
    console.log('🔴 DENYING REQUEST:', requestId);
    try {
      const result = await timeOffHelpers.update(requestId, { status: 'denied' });
      console.log('✅ DENY SUCCESS:', result);
      dispatch({ type: 'UPDATE_TIME_OFF_REQUEST', payload: result });
    } catch (error) {
      console.error('❌ DENY ERROR:', error);
      alert(`Error denying request: ${error.message}`);
    }
  };

  const currentRequests = timeOffRequests.filter(isRequestCurrent);
  const futureRequests = timeOffRequests.filter(isRequestFuture);
  const pastRequests = timeOffRequests.filter(isRequestPast);

  // Custom day component for highlighting
  const CustomPickersDay = (props) => {
    const { day, ...other } = props;
    const highlightInfo = getDateHighlightInfo(day);
    
    if (!highlightInfo) {
      return <PickersDay {...other} day={day} />;
    }

    const { isApproved, isMixed, totalCount } = highlightInfo;
    
    let backgroundColor = '#e3f2fd'; // Light blue for pending
    let borderColor = '#2196f3'; // Blue border for pending
    
    if (isApproved && !isMixed) {
      backgroundColor = '#e8f5e8'; // Light green for approved only
      borderColor = '#4caf50'; // Green border for approved only
    } else if (isMixed) {
      backgroundColor = '#fff3e0'; // Light orange for mixed
      borderColor = '#ff9800'; // Orange border for mixed
    }

    return (
      <PickersDay
        {...other}
        day={day}
        sx={{
          backgroundColor,
          border: `2px solid ${borderColor}`,
          borderRadius: '50%',
          '&:hover': {
            backgroundColor: isApproved ? '#c8e6c9' : '#bbdefb',
          },
          '&.Mui-selected': {
            backgroundColor: isApproved ? '#4caf50' : '#2196f3',
            color: 'white',
            '&:hover': {
              backgroundColor: isApproved ? '#45a049' : '#1976d2',
            },
          },
        }}
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Time Off Requests</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(event, newViewMode) => {
              if (newViewMode !== null) {
                setViewMode(newViewMode);
              }
            }}
            size="small"
          >
            <ToggleButton value="list">
              <ListIcon />
            </ToggleButton>
            <ToggleButton value="calendar">
              <CalendarMonthIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
          >
            Add Time Off Request
          </Button>
        </Box>
      </Box>

      {/* View Toggle Content */}
      {viewMode === 'list' ? (
        <>
          {/* Current Time Off Requests */}
          <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" color="primary">
            Current Time Off ({currentRequests.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {currentRequests.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No current time off requests
            </Typography>
          ) : (
            <List>
              {currentRequests.map((request) => (
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
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          <Chip label={request.status} color={request.status === 'approved' ? 'success' : 'warning'} size="small" />
                          {isWithinNextTwoWeeks(request.start_date) && (
                            <Chip label="Short Notice" color="warning" size="small" variant="outlined" />
                          )}
                          {isLongerThanSevenDays(request.start_date, request.end_date) && (
                            <Chip label="Long Request" color="info" size="small" variant="outlined" />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {request.status === 'pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              onClick={() => handleApprove(request.id)}
                              color="success"
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deny">
                            <IconButton
                              size="small"
                              onClick={() => handleDeny(request.id)}
                              color="error"
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(request)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(request.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Future Time Off Requests */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" color="primary">
            Future Time Off ({futureRequests.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {futureRequests.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No future time off requests
            </Typography>
          ) : (
            <List>
              {futureRequests.map((request) => (
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
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          <Chip label={request.status} color={request.status === 'approved' ? 'success' : 'warning'} size="small" />
                          {isWithinNextTwoWeeks(request.start_date) && (
                            <Chip label="Short Notice" color="warning" size="small" variant="outlined" />
                          )}
                          {isLongerThanSevenDays(request.start_date, request.end_date) && (
                            <Chip label="Long Request" color="info" size="small" variant="outlined" />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {request.status === 'pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              onClick={() => handleApprove(request.id)}
                              color="success"
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Deny">
                            <IconButton
                              size="small"
                              onClick={() => handleDeny(request.id)}
                              color="error"
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(request)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(request.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Past Time Off Requests */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" color="primary">
            Past Time Off ({pastRequests.length})
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {pastRequests.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No past time off requests
            </Typography>
          ) : (
            <List>
              {pastRequests.map((request) => (
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
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          <Chip label={request.status} color={request.status === 'approved' ? 'success' : 'warning'} size="small" />
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(request)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(request.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </AccordionDetails>
      </Accordion>
        </>
      ) : (
        /* Calendar View */
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <DateCalendar
                  value={selectedDate}
                  onChange={(newDate) => setSelectedDate(newDate)}
                  sx={{ width: '100%' }}
                  slots={{ day: CustomPickersDay }}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: 'fit-content' }}>
                <Typography variant="h6" gutterBottom>
                  Time Off for {format(selectedDate, 'MMM dd, yyyy')}
                </Typography>
                {getRequestsForDate(selectedDate).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No time off requests for this date
                  </Typography>
                ) : (
                  <List dense>
                    {getRequestsForDate(selectedDate).map((request) => (
                      <ListItem key={request.id} sx={{ px: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: getStaffColor(request.staff_id),
                              mr: 1,
                              flexShrink: 0
                            }}
                          />
                          <ListItemText
                            primary={getStaffName(request.staff_id)}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                                </Typography>
                                {request.reason && (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    "{request.reason}"
                                  </Typography>
                                )}
                                <Chip 
                                  label={request.status} 
                                  color={request.status === 'approved' ? 'success' : request.status === 'denied' ? 'error' : 'warning'} 
                                  size="small" 
                                  sx={{ mt: 0.5 }}
                                />
                              </Box>
                            }
                          />
                          {request.status === 'pending' && (
                            <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    console.log('🟢 APPROVE BUTTON CLICKED for request:', request.id);
                                    handleApprove(request.id);
                                  }}
                                  color="success"
                                  sx={{ 
                                    '&:hover': { 
                                      backgroundColor: 'success.light',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <ApproveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Deny">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    console.log('🔴 DENY BUTTON CLICKED for request:', request.id);
                                    handleDeny(request.id);
                                  }}
                                  color="error"
                                  sx={{ 
                                    '&:hover': { 
                                      backgroundColor: 'error.light',
                                      color: 'white'
                                    }
                                  }}
                                >
                                  <DenyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
          
          {/* Staff Legend */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Staff Legend
            </Typography>
            <Grid container spacing={1}>
              {staff.map((staffMember) => (
                <Grid item key={staffMember.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: getStaffColor(staffMember.id),
                        flexShrink: 0
                      }}
                    />
                    <Typography variant="body2">
                      {staffMember.name}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Calendar Legend */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Calendar Legend
            </Typography>
            <Grid container spacing={2}>
              <Grid item>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: '#e8f5e8',
                      border: '2px solid #4caf50',
                      flexShrink: 0
                    }}
                  />
                  <Typography variant="body2">
                    Approved Time Off
                  </Typography>
                </Box>
              </Grid>
              <Grid item>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: '#e3f2fd',
                      border: '2px solid #2196f3',
                      flexShrink: 0
                    }}
                  />
                  <Typography variant="body2">
                    Pending Time Off
                  </Typography>
                </Box>
              </Grid>
              <Grid item>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: '#fff3e0',
                      border: '2px solid #ff9800',
                      flexShrink: 0
                    }}
                  />
                  <Typography variant="body2">
                    Mixed (Approved + Pending)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </LocalizationProvider>
      )}

      {/* Time Off Request Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRequest ? 'Edit Time Off Request' : 'Add Time Off Request'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Guidelines:</strong><br />
              • Submit requests at least 2 weeks in advance when possible<br />
              • Provide a reason for your time off request<br />
              • Check for conflicts with other staff members<br />
              • Long requests (7+ days) require manager approval
            </Typography>
          </Alert>

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Staff Member</InputLabel>
            <Select
              value={timeOffForm.staffId}
              onChange={(e) => setTimeOffForm({ ...timeOffForm, staffId: e.target.value })}
              label="Staff Member"
            >
              {staff.map((staffMember) => (
                <MenuItem key={staffMember.id} value={staffMember.id}>
                  {staffMember.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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

          <FormControlLabel
            control={
              <Switch
                checked={timeOffForm.preApprove}
                onChange={(e) => setTimeOffForm({ ...timeOffForm, preApprove: e.target.checked })}
                color="primary"
              />
            }
            label="Pre-approve this request"
            sx={{ mt: 2 }}
          />
          {timeOffForm.preApprove && (
            <Alert severity="success" sx={{ mt: 1 }}>
              <Typography variant="body2">
                This request will be automatically approved when created.
              </Typography>
            </Alert>
          )}

          {timeOffForm.startDate && timeOffForm.endDate && isLongerThanSevenDays(timeOffForm.startDate, timeOffForm.endDate) && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              <Typography variant="body2">
                This is a large time off request (more than 7 days). Please communicate with a manager.
              </Typography>
            </Alert>
          )}

          {timeOffForm.startDate && timeOffForm.endDate && (() => {
            const overlappingRequests = getOverlappingRequests(timeOffForm.startDate, timeOffForm.endDate, editingRequest?.id);
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!timeOffForm.staffId || !timeOffForm.startDate || !timeOffForm.endDate}
          >
            {editingRequest ? 'Update' : 'Add'} Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TimeOffRequestsTab;
