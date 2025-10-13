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
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';
import { staffShiftRecordsHelpers } from '../lib/supabaseHelpers';

function StaffShiftRecordsPanel({ staffId, staffName, roles = [] }) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  const [newRecord, setNewRecord] = useState({
    role_name: '',
    quantity: 1,
    shift_date: new Date().toISOString().split('T')[0] // Default to today
  });

  // Load records and summary
  const loadData = async () => {
    if (!staffId) return;
    
    setLoading(true);
    try {
      const [recordsData, summaryData] = await Promise.all([
        staffShiftRecordsHelpers.getByStaff(staffId),
        staffShiftRecordsHelpers.getSummaryByStaff(staffId)
      ]);
      
      setRecords(recordsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading shift records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [staffId]);

  // Add manual record
  const handleAddRecord = async () => {
    if (!newRecord.role_name || newRecord.quantity <= 0) return;

    try {
      // Add multiple records if quantity > 1
      for (let i = 0; i < newRecord.quantity; i++) {
        await staffShiftRecordsHelpers.add({
          staff_id: staffId,
          role_name: newRecord.role_name,
          shift_name: 'Manual Entry',
          shift_date: newRecord.shift_date,
          week_key: newRecord.shift_date,
          day_of_week: new Date(newRecord.shift_date).toLocaleDateString('en-US', { weekday: 'long' }),
          notes: 'Manually added role assignment',
          is_coverage: false,
          recorded_by: 'Manual Entry'
        });
      }

      setNewRecord({
        role_name: '',
        quantity: 1,
        shift_date: new Date().toISOString().split('T')[0]
      });
      setAddDialogOpen(false);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error adding role record:', error);
    }
  };

  // Delete record
  const handleDeleteRecord = async (recordId) => {
    try {
      await staffShiftRecordsHelpers.delete(recordId);
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error deleting role record:', error);
    }
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

  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`role-records-tabpanel-${index}`}
      aria-labelledby={`role-records-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Role Experience
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {staffName} - Role assignments and experience
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Role Summary" />
          <Tab label="Assignment History" />
        </Tabs>
      </Box>

      {/* Role Summary Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="subtitle2" gutterBottom>
          Role Experience Summary
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
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

        {/* Quick Stats */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="primary">
                  {records.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Assignments
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="success.main">
                  {Object.keys(summary).length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Roles Worked
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" color="info.main">
                  {Math.max(...Object.values(summary), 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Most Worked
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Assignment History Tab */}
      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading role assignments...
            </Typography>
          </Box>
        ) : records.length === 0 ? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No role assignments found
            </Typography>
          </Box>
        ) : (
          <List dense>
            {records.map((record, index) => (
              <React.Fragment key={record.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WorkIcon sx={{ fontSize: 16, color: getRoleColor(record.role_name) }} />
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {record.role_name}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Date: {format(new Date(record.shift_date), 'MMM dd, yyyy')} • {record.day_of_week}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Recorded: {formatDistanceToNow(new Date(record.recorded_at), { addSuffix: true })}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteRecord(record.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < records.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </TabPanel>

      {/* Add Role Button */}
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

      {/* Add Role Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Role Assignment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newRecord.role_name}
                onChange={(e) => setNewRecord({ ...newRecord, role_name: e.target.value })}
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
              label="Date Worked"
              type="date"
              value={newRecord.shift_date}
              onChange={(e) => setNewRecord({ ...newRecord, shift_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <TextField
              label="Quantity"
              type="number"
              value={newRecord.quantity}
              onChange={(e) => setNewRecord({ ...newRecord, quantity: parseInt(e.target.value) || 1 })}
              inputProps={{ min: 1, max: 10 }}
              helperText="Number of role assignments to add"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddRecord}
            variant="contained"
            disabled={!newRecord.role_name || !newRecord.shift_date || newRecord.quantity <= 0}
          >
            Add Assignment{newRecord.quantity > 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StaffShiftRecordsPanel;