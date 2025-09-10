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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { format, isAfter, isBefore, addDays, differenceInDays } from 'date-fns';
import { useData } from '../context/DataContext';
import { timeOffHelpers } from '../lib/supabaseHelpers';

function TimeOffRequestsTab() {
  const { timeOffRequests, staff, roles, dispatch } = useData();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [timeOffForm, setTimeOffForm] = useState({
    staffId: '',
    startDate: '',
    endDate: '',
    reason: '',
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

  const handleOpenDialog = (request = null) => {
    if (request) {
      setEditingRequest(request);
      setTimeOffForm({
        staffId: request.staff_id,
        startDate: request.start_date,
        endDate: request.end_date,
        reason: request.reason || '',
      });
    } else {
      setEditingRequest(null);
      setTimeOffForm({
        staffId: '',
        startDate: '',
        endDate: '',
        reason: '',
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
    });
  };

  const handleSubmit = async () => {
    if (!timeOffForm.staffId || !timeOffForm.startDate || !timeOffForm.endDate) return;

    try {
      if (editingRequest) {
        const updatedRequest = await timeOffHelpers.update(editingRequest.id, {
          staff_id: timeOffForm.staffId,
          start_date: timeOffForm.startDate,
          end_date: timeOffForm.endDate,
          reason: timeOffForm.reason || null,
        });
        dispatch({ type: 'UPDATE_TIME_OFF_REQUEST', payload: updatedRequest });
      } else {
        const newRequest = await timeOffHelpers.add({
          staff_id: timeOffForm.staffId,
          start_date: timeOffForm.startDate,
          end_date: timeOffForm.endDate,
          reason: timeOffForm.reason || null,
        });
        dispatch({ type: 'ADD_TIME_OFF_REQUEST', payload: newRequest });
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving time off request:', error);
      alert(`Error saving time off request: ${error.message}`);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      const updatedRequest = await timeOffHelpers.update(requestId, { status: 'approved' });
      dispatch({ type: 'UPDATE_TIME_OFF_REQUEST', payload: updatedRequest });
    } catch (error) {
      console.error('Error approving time off request:', error);
      alert(`Error approving request: ${error.message}`);
    }
  };

  const handleDeny = async (requestId) => {
    try {
      const updatedRequest = await timeOffHelpers.update(requestId, { status: 'denied' });
      dispatch({ type: 'UPDATE_TIME_OFF_REQUEST', payload: updatedRequest });
    } catch (error) {
      console.error('Error denying time off request:', error);
      alert(`Error denying request: ${error.message}`);
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

  const currentRequests = timeOffRequests.filter(isRequestCurrent);
  const futureRequests = timeOffRequests.filter(isRequestFuture);
  const pastRequests = timeOffRequests.filter(isRequestPast);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Time Off Requests</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          Add Time Off Request
        </Button>
      </Box>

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
