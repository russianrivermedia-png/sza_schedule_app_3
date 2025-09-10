import React, { useState, useRef, useEffect } from 'react';
// Updated with default starting time feature
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
  TextField,
  Typography,
  Chip,
  Alert,
  Divider,
  Switch,
  FormControlLabel,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
  AddCircle as AddCircleIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { shiftHelpers } from '../lib/supabaseHelpers';

function ShiftCreationTab() {
  const { shifts, roles, tours, dispatch } = useData();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const shiftNameInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    requiredRoles: [],
    tours: [],
    defaultStartingTime: '',
    isTeamEvent: false,
  });
  
  // Bulk creation state
  const [bulkData, setBulkData] = useState({
    baseName: '',
    count: 1,
    startNumber: 1,
    suffix: '',
    description: '',
    requiredRoles: [],
    tours: [],
    defaultStartingTime: '',
    isTeamEvent: false,
  });
  
  const [bulkShifts, setBulkShifts] = useState([]);

  const handleOpenDialog = (shift = null) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        name: shift.name,
        description: shift.description || '',
        requiredRoles: shift.required_roles || shift.requiredRoles || [],
        tours: shift.tours || [],
        defaultStartingTime: shift.default_starting_time || shift.defaultStartingTime || '',
        isTeamEvent: shift.is_team_event || shift.isTeamEvent || false,
      });
    } else {
      setEditingShift(null);
      setFormData({
        name: '',
        description: '',
        requiredRoles: [],
        tours: [],
        defaultStartingTime: '',
        isTeamEvent: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingShift(null);
    setFormData({
      name: '',
      description: '',
      requiredRoles: [],
      tours: [],
      defaultStartingTime: '',
      isTeamEvent: false,
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || formData.requiredRoles.length === 0) return;

    try {
    const shiftData = {
      name: formData.name.trim(),
        description: formData.description.trim() || null,
        required_roles: formData.requiredRoles,
      tours: formData.tours,
      default_starting_time: formData.defaultStartingTime || null,
      is_team_event: formData.isTeamEvent,
    };

    if (editingShift) {
        const updatedShift = await shiftHelpers.update(editingShift.id, shiftData);
        dispatch({ type: 'UPDATE_SHIFT', payload: updatedShift });
    } else {
        const newShift = await shiftHelpers.add(shiftData);
        dispatch({ type: 'ADD_SHIFT', payload: newShift });
    }

    handleCloseDialog();
    } catch (error) {
      console.error('Error saving shift:', error);
      alert(`Error saving shift: ${error.message}. Please try again.`);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('Are you sure you want to delete this shift? This will affect all schedules using this shift.')) {
      try {
        await shiftHelpers.delete(shiftId);
      dispatch({ type: 'DELETE_SHIFT', payload: shiftId });
      } catch (error) {
        console.error('Error deleting shift:', error);
        alert(`Error deleting shift: ${error.message}. Please try again.`);
      }
    }
  };

  // Auto-focus on shift name input when dialog opens
  useEffect(() => {
    if (openDialog && shiftNameInputRef.current) {
      shiftNameInputRef.current.focus();
    }
  }, [openDialog]);

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  // Bulk creation functions
  const generateBulkShifts = () => {
    const shifts = [];
    for (let i = 0; i < bulkData.count; i++) {
      const number = bulkData.startNumber + i;
      const name = `${bulkData.baseName} ${number}${bulkData.suffix}`;
      shifts.push({
        id: `bulk-${Date.now()}-${i}`,
        name: name.trim(),
        description: bulkData.description,
        requiredRoles: [...bulkData.requiredRoles],
        tours: [...bulkData.tours],
        defaultStartingTime: bulkData.defaultStartingTime,
        isTeamEvent: bulkData.isTeamEvent,
      });
    }
    setBulkShifts(shifts);
  };

  const handleBulkSubmit = async () => {
    if (!bulkData.baseName.trim() || bulkData.requiredRoles.length === 0) return;
    
    // Generate shifts if not already generated
    if (bulkShifts.length === 0) {
      generateBulkShifts();
      return;
    }

    try {
      // Add all generated shifts to Supabase
      for (const shift of bulkShifts) {
        const shiftData = {
          name: shift.name,
          description: shift.description || null,
          required_roles: shift.requiredRoles,
          tours: shift.tours,
          default_starting_time: shift.defaultStartingTime || null,
          is_team_event: shift.isTeamEvent || false,
        };
        const newShift = await shiftHelpers.add(shiftData);
        dispatch({ type: 'ADD_SHIFT', payload: newShift });
      }

      // Reset and close
      setBulkShifts([]);
      setBulkData({
        baseName: '',
        count: 1,
        startNumber: 1,
        suffix: '',
        description: '',
        requiredRoles: [],
        tours: [],
        defaultStartingTime: '',
      });
      setBulkMode(false);
      setOpenDialog(false);
    } catch (error) {
      console.error('Error creating bulk shifts:', error);
      alert(`Error creating shifts: ${error.message}. Please try again.`);
    }
  };

  const handleBulkRoleChange = (event) => {
    const { value } = event.target;
    setBulkData(prev => ({
      ...prev,
      requiredRoles: Array.isArray(value) ? value : [value],
    }));
  };

  const handleBulkTourChange = (event) => {
    const { value } = event.target;
    setBulkData(prev => ({
      ...prev,
      tours: Array.isArray(value) ? value : [value],
    }));
  };

  const handleCopyShift = (shift) => {
    setFormData({
      name: shift.name,
      description: shift.description || '',
      requiredRoles: [...(shift.required_roles || shift.requiredRoles || [])],
      tours: [...shift.tours],
      defaultStartingTime: shift.default_starting_time || shift.defaultStartingTime || '',
      isTeamEvent: shift.is_team_event || shift.isTeamEvent || false,
    });
    setBulkMode(false);
    setEditingShift(null);
  };

  const handleRoleChange = (event) => {
    const { value } = event.target;
    setFormData(prev => ({
      ...prev,
      requiredRoles: Array.isArray(value) ? value : [value],
    }));
  };

  const handleTourChange = (event) => {
    const { value } = event.target;
    setFormData(prev => ({
      ...prev,
      tours: Array.isArray(value) ? value : [value],
    }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
        <Typography variant="h4">Shift Management</Typography>
          <Typography variant="body2" color="text.secondary">
            {shifts.length} shift{shifts.length !== 1 ? 's' : ''} created
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Shift
        </Button>
      </Box>

      <Grid container spacing={3}>
        {shifts.map((shift) => (
          <Grid item xs={12} md={6} lg={4} key={shift.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" component="div">
                      {shift.name}
                    </Typography>
                    {(shift.is_team_event || shift.isTeamEvent) && (
                      <Chip
                        label="Team Event"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleCopyShift(shift)}
                      title="Copy Shift"
                    >
                      <ContentCopyIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(shift)}
                      title="Edit Shift"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteShift(shift.id)}
                      title="Delete Shift"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                {shift.description && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {shift.description}
                  </Typography>
                )}

                {shift.defaultStartingTime && (
                  <Typography variant="body2" color="info.main" gutterBottom>
                    <strong>Default Start Time:</strong> {shift.defaultStartingTime}
                  </Typography>
                )}

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Required Roles:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(shift.required_roles || shift.requiredRoles || []).map(roleId => {
                      const role = roles.find(r => r.id === roleId);
                      return role ? (
                        <Chip
                          key={roleId}
                          label={role.name}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ) : null;
                    })}
                  </Box>
                </Box>

                {shift.tours && shift.tours.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Attached Tours:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {shift.tours.map(tourId => {
                        const tour = tours.find(t => t.id === tourId);
                        return tour ? (
                          <Chip
                            key={tourId}
                            label={tour.name}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        ) : null;
                      })}
                    </Box>
                  </Box>
                )}

              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {shifts.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No shifts created yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Create your first shift template to get started
          </Typography>
        </Box>
      )}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
          {editingShift ? 'Edit Shift' : 'Add New Shift'}
            </Typography>
            {!editingShift && (
              <FormControlLabel
                control={
                  <Switch
                    checked={bulkMode}
                    onChange={(e) => setBulkMode(e.target.checked)}
                  />
                }
                label="Bulk Mode"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {!bulkMode ? (
            // Single shift creation
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Shift Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyPress={handleKeyPress}
                inputRef={shiftNameInputRef}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Default Starting Time (Optional)"
              type="time"
              value={formData.defaultStartingTime}
              onChange={(e) => setFormData({ ...formData, defaultStartingTime: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              helperText="This time will be pre-filled in the arrival time slot when this shift is used"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isTeamEvent}
                  onChange={(e) => setFormData({ ...formData, isTeamEvent: e.target.checked })}
                  color="primary"
                />
              }
              label="Team Event (Assigns all staff members)"
              sx={{ mt: 2 }}
            />
            {formData.isTeamEvent && (
              <Alert severity="info" sx={{ mt: 1 }}>
                This shift will automatically assign all staff members when added to a schedule.
              </Alert>
            )}
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Required Roles *</InputLabel>
              <Select
                multiple
                value={formData.requiredRoles}
                onChange={handleRoleChange}
                label="Required Roles *"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const role = roles.find(r => r.id === value);
                      return role ? (
                        <Chip key={value} label={role.name} size="small" />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Attach Tours (Optional)</InputLabel>
              <Select
                multiple
                value={formData.tours}
                onChange={handleTourChange}
                label="Attach Tours (Optional)"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const tour = tours.find(t => t.id === value);
                      return tour ? (
                        <Chip key={value} label={tour.name} size="small" color="secondary" />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {tours.map((tour) => (
                  <MenuItem key={tour.id} value={tour.id}>
                    {tour.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.requiredRoles.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Please select at least one required role for this shift.
              </Alert>
            )}
          </Box>
          ) : (
            // Bulk shift creation
            <Box sx={{ pt: 1 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Example:</strong> Base Name: "Tree Tops", Count: 3, Start Number: 1, Suffix: "Ground Support" 
                  will create: Tree Tops 1 Ground Support, Tree Tops 2 Ground Support, Tree Tops 3 Ground Support
                </Typography>
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Base Name *"
                    value={bulkData.baseName}
                    onChange={(e) => setBulkData({ ...bulkData, baseName: e.target.value })}
                    placeholder="e.g., Tree Tops, Ground Support"
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Count"
                    type="number"
                    value={bulkData.count}
                    onChange={(e) => setBulkData({ ...bulkData, count: parseInt(e.target.value) || 1 })}
                    margin="normal"
                    inputProps={{ min: 1, max: 20 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Start Number"
                    type="number"
                    value={bulkData.startNumber}
                    onChange={(e) => setBulkData({ ...bulkData, startNumber: parseInt(e.target.value) || 1 })}
                    margin="normal"
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Suffix (Optional)"
                    value={bulkData.suffix}
                    onChange={(e) => setBulkData({ ...bulkData, suffix: e.target.value })}
                    placeholder="e.g., Ground Support, Morning, etc."
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={bulkData.description}
                    onChange={(e) => setBulkData({ ...bulkData, description: e.target.value })}
                    margin="normal"
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Default Starting Time (Optional)"
                    type="time"
                    value={bulkData.defaultStartingTime}
                    onChange={(e) => setBulkData({ ...bulkData, defaultStartingTime: e.target.value })}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                    helperText="This time will be pre-filled in the arrival time slot when these shifts are used"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={bulkData.isTeamEvent || false}
                        onChange={(e) => setBulkData({ ...bulkData, isTeamEvent: e.target.checked })}
                        color="primary"
                      />
                    }
                    label="Team Event (Assigns all staff members)"
                    sx={{ mt: 2 }}
                  />
                  {(bulkData.isTeamEvent || false) && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      These shifts will automatically assign all staff members when added to a schedule.
                    </Alert>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel>Required Roles *</InputLabel>
                    <Select
                      multiple
                      value={bulkData.requiredRoles}
                      onChange={handleBulkRoleChange}
                      label="Required Roles *"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const role = roles.find(r => r.id === value);
                            return role ? (
                              <Chip key={value} label={role.name} size="small" />
                            ) : null;
                          })}
                        </Box>
                      )}
                    >
                      {roles.map((role) => (
                        <MenuItem key={role.id} value={role.id}>
                          {role.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Attach Tours (Optional)</InputLabel>
                    <Select
                      multiple
                      value={bulkData.tours}
                      onChange={handleBulkTourChange}
                      label="Attach Tours (Optional)"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => {
                            const tour = tours.find(t => t.id === value);
                            return tour ? (
                              <Chip key={value} label={tour.name} size="small" color="secondary" />
                            ) : null;
                          })}
                        </Box>
                      )}
                    >
                      {tours.map((tour) => (
                        <MenuItem key={tour.id} value={tour.id}>
                          {tour.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {bulkData.baseName.trim() && bulkData.requiredRoles.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<AddCircleIcon />}
                    onClick={generateBulkShifts}
                    fullWidth
                  >
                    Preview Shifts
                  </Button>
                </Box>
              )}

              {bulkShifts.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Preview ({bulkShifts.length} shifts):
                  </Typography>
                  <List dense>
                    {bulkShifts.map((shift, index) => (
                      <ListItem key={shift.id} divider>
                        <ListItemText
                          primary={shift.name}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {bulkData.requiredRoles.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Please select at least one required role for these shifts.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {!bulkMode ? (
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.name.trim() || formData.requiredRoles.length === 0}
          >
            {editingShift ? 'Update' : 'Add'}
          </Button>
          ) : (
            <Button 
              onClick={handleBulkSubmit} 
              variant="contained"
              disabled={!bulkData.baseName.trim() || bulkData.requiredRoles.length === 0}
            >
              {bulkShifts.length === 0 ? 'Preview Shifts' : `Create ${bulkShifts.length} Shifts`}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ShiftCreationTab;
