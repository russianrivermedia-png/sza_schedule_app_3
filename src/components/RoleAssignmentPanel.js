import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { roleAssignmentsHelpers } from '../lib/supabaseHelpers';

function RoleAssignmentPanel({ staffId, staffName, roles = [] }) {
  const [assignments, setAssignments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    role: '',
    quantity: 1,
    notes: ''
  });

  // Load assignments and summary
  const loadData = async () => {
    if (!staffId) return;
    
    setLoading(true);
    try {
      const [assignmentsData, summaryData] = await Promise.all([
        roleAssignmentsHelpers.getByStaff(staffId),
        roleAssignmentsHelpers.getSummaryByStaff(staffId)
      ]);
      
      setAssignments(assignmentsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading role assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [staffId]);

  // Add manual assignment
  const handleAddAssignment = async () => {
    if (!newAssignment.role || newAssignment.quantity <= 0) return;

    try {
      // Add multiple assignments if quantity > 1
      for (let i = 0; i < newAssignment.quantity; i++) {
        await roleAssignmentsHelpers.add(
          staffId,
          newAssignment.role,
          null, // shiftId
          null, // tourId
          null, // weekKey
          true, // isManual
          'Manual Entry' // createdBy
        );
      }

      setNewAssignment({ role: '', quantity: 1, notes: '' });
      setAddDialogOpen(false);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error adding assignment:', error);
    }
  };

  // Delete assignment
  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await roleAssignmentsHelpers.delete(assignmentId);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const formatAssignmentDate = (dateString) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const getRoleColor = (role) => {
    const colors = {
      'Lead Guide': '#4caf50',
      'Sweep Guide': '#2196f3',
      'Ground Support': '#ff9800',
      'Night Tour Lead': '#9c27b0',
      'Tree Tops Sweep': '#00bcd4'
    };
    return colors[role] || '#757575';
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Role Assignment History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {staffName}
        </Typography>
      </Box>

      {/* Summary Section */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>
          Role Summary
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(summary).map(([role, count]) => (
            <Chip
              key={role}
              label={`${role}: ${count}`}
              size="small"
              sx={{
                backgroundColor: getRoleColor(role),
                color: 'white',
                '& .MuiChip-label': {
                  fontWeight: 'bold'
                }
              }}
            />
          ))}
          {Object.keys(summary).length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No role assignments yet
            </Typography>
          )}
        </Box>
      </Box>

      {/* Activity Log */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Assignment Log
          </Typography>
        </Box>
        
        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading assignments...
            </Typography>
          </Box>
        ) : assignments.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No assignments recorded
            </Typography>
          </Box>
        ) : (
          <List dense>
            {assignments.map((assignment, index) => (
              <React.Fragment key={assignment.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssignmentIcon sx={{ fontSize: 16, color: getRoleColor(assignment.role) }} />
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {assignment.role}
                        </Typography>
                        {assignment.is_manual && (
                          <Chip label="Manual" size="small" color="secondary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatAssignmentDate(assignment.assignment_date)}
                        </Typography>
                        {assignment.week_key && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Week: {assignment.week_key}
                          </Typography>
                        )}
                        {assignment.created_by && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            By: {assignment.created_by}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < assignments.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>

      {/* Add Assignment Button */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          fullWidth
        >
          Add Role Assignment
        </Button>
      </Box>

      {/* Add Assignment Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Role Assignment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newAssignment.role}
                onChange={(e) => setNewAssignment({ ...newAssignment, role: e.target.value })}
                label="Role"
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.name}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Quantity"
              type="number"
              value={newAssignment.quantity}
              onChange={(e) => setNewAssignment({ ...newAssignment, quantity: parseInt(e.target.value) || 1 })}
              inputProps={{ min: 1, max: 10 }}
              helperText="Number of assignments to add"
            />
            
            <TextField
              label="Notes (Optional)"
              multiline
              rows={2}
              value={newAssignment.notes}
              onChange={(e) => setNewAssignment({ ...newAssignment, notes: e.target.value })}
              placeholder="Add any notes about this assignment..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddAssignment}
            variant="contained"
            disabled={!newAssignment.role || newAssignment.quantity <= 0}
          >
            Add Assignment{newAssignment.quantity > 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RoleAssignmentPanel;
