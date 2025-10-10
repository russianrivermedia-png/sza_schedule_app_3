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
  Grid,
  IconButton,
  TextField,
  Typography,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  BugReport as BugReportIcon,
  Clear as ClearIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Publish as PublishIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLocalSchedule } from '../hooks/useLocalSchedule';
import { useSchedulePersistence } from '../hooks/useSchedulePersistence';
import DraggableStaff from './DraggableStaff';
import DroppableRole from './DroppableRole';
import { getStaffColorValue, getTourColorValue } from '../config/staffColors';

const DAYS_OF_WEEK = ['Friday', 'Saturday'];

function ScheduleBuilderTabClean() {
  const { 
    staff, 
    shifts, 
    roles, 
    tours, 
    schedules, 
    timeOffRequests, 
    currentWeek, 
    dispatch,
    loading,
    getStaffById,
    getRoleById,
    getTimeOffByStaffId
  } = useData();
  
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Week selection
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  
  // Local schedule management
  const {
    localSchedule,
    hasUnsavedChanges,
    isDirty,
    updateLocalSchedule,
    clearLocalAssignments,
    markAsSaved,
    resetToDatabase,
    weekKey
  } = useLocalSchedule(selectedWeek, schedules);
  
  // Persistence management
  const { saveSchedule, clearDatabaseAssignments } = useSchedulePersistence(dispatch);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);
  const [bugFixingMenuAnchor, setBugFixingMenuAnchor] = useState(null);

  // Get week dates
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 });
  const weekDates = DAYS_OF_WEEK.map((_, index) => addDays(weekStart, index));

  // Auto-save functionality (optional)
  useEffect(() => {
    if (hasUnsavedChanges && isDirty) {
      const autoSaveTimer = setTimeout(() => {
        handleSave();
      }, 30000); // Auto-save after 30 seconds of inactivity
      
      return () => clearTimeout(autoSaveTimer);
    }
  }, [hasUnsavedChanges, isDirty]);

  // Save function
  const handleSave = async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      setIsSaving(true);
      await saveSchedule(localSchedule, weekKey, weekStart);
      markAsSaved();
      console.log('✅ Schedule saved successfully');
    } catch (error) {
      console.error('❌ Error saving schedule:', error);
      alert('Error saving schedule: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Clear week function
  const handleClearWeek = async () => {
    if (!window.confirm('Are you sure you want to clear all assignments for this week? This action cannot be undone.')) {
      return;
    }

    try {
      setIsClearing(true);
      
      // Clear local assignments
      clearLocalAssignments();
      
      // Clear database assignments
      const weekEnd = addDays(weekStart, 6);
      await clearDatabaseAssignments(weekStart, weekEnd);
      
      // Save the cleared schedule
      await saveSchedule(localSchedule, weekKey, weekStart);
      markAsSaved();
      
      console.log('✅ Week cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing week:', error);
      alert('Error clearing week: ' + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  // Reset to database state
  const handleReset = () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to reset to the saved version?')) {
      return;
    }
    resetToDatabase();
  };

  // Auto-assignment function (simplified)
  const handleAutoAssign = async () => {
    // This would contain your existing auto-assignment logic
    // but working with localSchedule instead of weekSchedule
    console.log('🤖 Auto-assignment not implemented yet');
  };

  // Render functions
  const renderDay = (day, dayIndex) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayData = localSchedule[dayKey] || { shifts: [] };
    const dayOfWeek = format(day, 'EEEE');

    return (
      <Grid item xs={12} md={6} key={dayKey}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {dayOfWeek} - {format(day, 'MMM d')}
            </Typography>
            
            {dayData.shifts?.map((shift, shiftIndex) => (
              <Box key={shift.id || shiftIndex} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {shift.name}
                </Typography>
                
                {/* Render assigned staff */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                  {Object.entries(shift.assignedStaff || {}).map(([roleId, staffId]) => {
                    const staffMember = getStaffById(staffId);
                    const role = getRoleById(roleId);
                    return (
                      <Chip
                        key={`${roleId}-${staffId}`}
                        label={`${staffMember?.name} (${role?.name})`}
                        size="small"
                        onDelete={() => {
                          updateLocalSchedule(prev => ({
                            ...prev,
                            [dayKey]: {
                              ...prev[dayKey],
                              shifts: prev[dayKey].shifts.map((s, i) => 
                                i === shiftIndex 
                                  ? { ...s, assignedStaff: { ...s.assignedStaff, [roleId]: undefined } }
                                  : s
                              )
                            }
                          }));
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading schedule data...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Schedule Builder</Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {hasUnsavedChanges && (
            <Alert severity="warning" sx={{ mr: 2 }}>
              You have unsaved changes
            </Alert>
          )}
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            disabled={!hasUnsavedChanges}
          >
            Reset
          </Button>
          
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AssignmentIcon />}
            onClick={handleAutoAssign}
          >
            Auto Assign
          </Button>
          
          <IconButton onClick={(e) => setActionsMenuAnchor(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Week selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Week of {format(weekStart, 'MMM d, yyyy')}
        </Typography>
      </Box>

      {/* Schedule grid */}
      <Grid container spacing={3}>
        {weekDates.map((day, dayIndex) => renderDay(day, dayIndex))}
      </Grid>

      {/* Actions menu */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={() => setActionsMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          handleClearWeek();
          setActionsMenuAnchor(null);
        }}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear Week</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          handleAutoAssign();
          setActionsMenuAnchor(null);
        }}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Auto Assign Staff</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default ScheduleBuilderTabClean;

