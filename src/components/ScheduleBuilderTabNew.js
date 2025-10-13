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
  Badge,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch
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
  Assignment as AssignmentIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLocalSchedule } from '../hooks/useLocalSchedule';
import { useSchedulePersistence } from '../hooks/useSchedulePersistence';
import { timeOffHelpers } from '../lib/supabaseHelpers';
import DraggableStaff from './DraggableStaff';
import DroppableRole from './DroppableRole';
import { getStaffColorValue, getTourColorValue } from '../config/staffColors';

const DAYS_OF_WEEK = ['Friday', 'Saturday'];

function ScheduleBuilderTabNew() {
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
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);
  const [bugFixingMenuAnchor, setBugFixingMenuAnchor] = useState(null);
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedShiftIndex, setSelectedShiftIndex] = useState(null);
  const [selectedShiftData, setSelectedShiftData] = useState(null);
  const [notes, setNotes] = useState('');
  const [expandedNotes, setExpandedNotes] = useState({});

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

  // Clear assignments function
  const handleClearAssignments = async () => {
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
      
      console.log('✅ Assignments cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing assignments:', error);
      alert('Error clearing assignments: ' + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  // Clear all shifts function
  const handleClearShifts = async () => {
    if (!window.confirm('Are you sure you want to clear all shifts for this week? This action cannot be undone.')) {
      return;
    }

    try {
      setIsClearing(true);
      
      // Clear all shifts from local state
      updateLocalSchedule(prev => {
        const clearedSchedule = {};
        Object.keys(prev).forEach(dayKey => {
          clearedSchedule[dayKey] = {
            ...prev[dayKey],
            shifts: []
          };
        });
        return clearedSchedule;
      });
      
      // Save the cleared schedule
      await saveSchedule(localSchedule, weekKey, weekStart);
      markAsSaved();
      
      console.log('✅ Shifts cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing shifts:', error);
      alert('Error clearing shifts: ' + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  // Clear day function
  const handleClearDay = async (dayKey) => {
    if (!window.confirm(`Are you sure you want to clear all shifts for ${format(new Date(dayKey), 'EEEE, MMM d')}?`)) {
      return;
    }

    try {
      // Clear shifts for specific day
      updateLocalSchedule(prev => ({
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          shifts: []
        }
      }));
      
      // Save the updated schedule
      await saveSchedule(localSchedule, weekKey, weekStart);
      markAsSaved();
      
      console.log('✅ Day cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing day:', error);
      alert('Error clearing day: ' + error.message);
    }
  };

  // Reset to database state
  const handleReset = () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to reset to the saved version?')) {
      return;
    }
    resetToDatabase();
  };

  // Get role tier information for prioritization
  const getRoleTierInfo = () => {
    const roleTierInfo = new Map();
    roles.forEach(role => {
      roleTierInfo.set(role.id, {
        name: role.name || 'Unknown Role',
        tier: role.tier || 1, // Default to tier 1 if not set
        priority: role.tier || 1 // Use tier as priority (1=highest, 3=lowest)
      });
    });
    return roleTierInfo;
  };

  // Auto-assignment function
  const handleAutoAssign = async () => {
    try {
      setIsAutoAssigning(true);
      console.log('🤖 Auto-assignment starting...');
      
      // Get role tier information for prioritization
      const roleTierInfo = getRoleTierInfo();
      console.log('📊 Role tier analysis:', roleTierInfo);
      
      // Create a working copy of the local schedule
      const workingSchedule = { ...localSchedule };
      let totalRoles = 0;
      let assignedRoles = 0;
      let unassignedRoles = [];
      
      // Validate that we have complete week data
      const expectedDays = weekDates.map(d => format(d, 'yyyy-MM-dd'));
      const actualDays = Object.keys(workingSchedule);
      const missingDays = expectedDays.filter(day => !actualDays.includes(day));
      
      if (missingDays.length > 0) {
        console.error('❌ INCOMPLETE WEEK DATA DETECTED!');
        console.error('Missing days:', missingDays);
        alert(`Cannot auto-assign: Missing schedule data for ${missingDays.length} days (${missingDays.join(', ')}). Please ensure the schedule is complete for this week.`);
        return;
      }

      // Pre-load time off conflicts for the entire week
      const weekEndDate = addDays(weekStart, 6);
      let timeOffConflicts = new Map();
      
      try {
        const conflicts = await timeOffHelpers.getConflictsForWeek(weekStart, weekEndDate);
        // Group by staff_id for faster lookup
        const conflictsByStaff = new Map();
        conflicts.forEach(conflict => {
          if (!conflictsByStaff.has(conflict.staff_id)) {
            conflictsByStaff.set(conflict.staff_id, []);
          }
          conflictsByStaff.get(conflict.staff_id).push(conflict);
        });
        timeOffConflicts = conflictsByStaff;
      } catch (error) {
        console.error('Error loading time off conflicts:', error);
      }

      // Get staff target shifts
      const staffTargetShifts = new Map();
      const weeklyStaffAssignments = new Map();
      
      staff.forEach(s => {
        staffTargetShifts.set(s.id, s.targetShifts || 5);
        weeklyStaffAssignments.set(s.id, 0);
      });

      // Count existing assignments
      Object.values(workingSchedule).forEach(day => {
        if (day.shifts) {
          day.shifts.forEach(shift => {
            Object.values(shift.assignedStaff || {}).forEach(staffId => {
              if (staffId) {
                weeklyStaffAssignments.set(staffId, (weeklyStaffAssignments.get(staffId) || 0) + 1);
              }
            });
          });
        }
      });

      // Collect all unassigned roles
      const allUnassignedRoles = [];
      const dayAssignedStaffMap = new Map();
      
      for (const dayKey of Object.keys(workingSchedule)) {
        const day = workingSchedule[dayKey];
        if (!day.shifts) continue;
        
        const dayOfWeek = DAYS_OF_WEEK[new Date(dayKey).getDay()];
        const dayDate = new Date(dayKey);
        
        // Track staff already assigned on this day
        const dayAssignedStaff = new Set();
        day.shifts.forEach(shift => {
          Object.values(shift.assignedStaff || {}).forEach(staffId => {
            if (staffId) {
              dayAssignedStaff.add(staffId);
            }
          });
        });
        dayAssignedStaffMap.set(dayKey, dayAssignedStaff);
        
        for (const [shiftIndex, shift] of day.shifts.entries()) {
          const roleIds = shift.required_roles || shift.requiredRoles || [];
          
          for (const roleId of roleIds) {
            totalRoles++;
            
            // Check if role is already assigned
            if (shift.assignedStaff?.[roleId]) {
              assignedRoles++;
              continue;
            }
            
            // Add to unassigned roles list
            const roleInfo = roleTierInfo.get(roleId);
            allUnassignedRoles.push({
              dayKey,
              dayOfWeek,
              dayDate,
              shiftIndex,
              shift,
              roleId,
              roleName: roleInfo?.name || 'Unknown Role',
              tier: roleInfo?.tier || 1,
              priority: roleInfo?.priority || 1
            });
          }
        }
      }
      
      // Sort by tier (tier 1 first) and then by day
      allUnassignedRoles.sort((a, b) => {
        if (a.tier !== b.tier) {
          return a.tier - b.tier;
        }
        return a.dayKey.localeCompare(b.dayKey);
      });
      
      console.log(`🎯 Processing ${allUnassignedRoles.length} unassigned roles`);
      
      // Simple assignment logic (can be enhanced with multi-pass later)
      for (const roleInfo of allUnassignedRoles) {
        const { dayKey, shiftIndex, roleId, roleName, tier } = roleInfo;
        const shift = workingSchedule[dayKey].shifts[shiftIndex];
        const dayAssignedStaff = dayAssignedStaffMap.get(dayKey);
        
        // Find available staff for this role
        const availableStaff = staff.filter(staffMember => {
          // Check if staff is trained for this role
          if (!staffMember.roles?.includes(roleId)) return false;
          
          // Check if staff is already assigned on this day
          if (dayAssignedStaff.has(staffMember.id)) return false;
          
          // Check time off conflicts
          const conflicts = timeOffConflicts.get(staffMember.id) || [];
          const hasConflict = conflicts.some(conflict => {
            const conflictDate = new Date(conflict.date);
            const roleDate = new Date(dayKey);
            return isSameDay(conflictDate, roleDate);
          });
          if (hasConflict) return false;
          
          return true;
        });
        
        if (availableStaff.length > 0) {
          // Sort available staff by target shift priority (highest target gap first)
          const staffWithPriority = availableStaff.map(staffMember => {
            const currentAssignments = weeklyStaffAssignments.get(staffMember.id) || 0;
            const targetShifts = staffTargetShifts.get(staffMember.id) || 5;
            const targetGap = targetShifts - currentAssignments; // How many shifts they still need
            
            return {
              staffMember,
              currentAssignments,
              targetShifts,
              targetGap
            };
          });
          
          // Sort by target gap (descending) - staff with higher targets get priority
          staffWithPriority.sort((a, b) => b.targetGap - a.targetGap);
          
          // Assign the staff member with the highest target gap
          const assignedStaff = staffWithPriority[0].staffMember;
          
          // Update the working schedule
          workingSchedule[dayKey].shifts[shiftIndex] = {
            ...shift,
            assignedStaff: {
              ...shift.assignedStaff,
              [roleId]: assignedStaff.id
            }
          };
          
          // Update tracking
          dayAssignedStaff.add(assignedStaff.id);
          weeklyStaffAssignments.set(assignedStaff.id, (weeklyStaffAssignments.get(assignedStaff.id) || 0) + 1);
          assignedRoles++;
          
          console.log(`✅ Assigned ${assignedStaff.name} to ${roleName} (Tier ${tier}) on ${format(new Date(dayKey), 'EEEE, MMM d')}`);
        } else {
          unassignedRoles.push(roleInfo);
          console.log(`❌ No available staff for ${roleName} (Tier ${tier}) on ${format(new Date(dayKey), 'EEEE, MMM d')}`);
        }
      }
      
      // Update local schedule with results
      updateLocalSchedule(workingSchedule);
      
      console.log(`✅ Auto-assignment completed: ${assignedRoles}/${totalRoles} roles assigned`);
      
      if (unassignedRoles.length > 0) {
        console.log(`⚠️ ${unassignedRoles.length} roles could not be assigned`);
        alert(`Auto-assignment completed: ${assignedRoles}/${totalRoles} roles assigned. ${unassignedRoles.length} roles could not be assigned due to staff availability.`);
      } else {
        alert(`Auto-assignment completed successfully: All ${assignedRoles} roles assigned!`);
      }
      
    } catch (error) {
      console.error('❌ Error during auto-assignment:', error);
      alert('Error during auto-assignment: ' + error.message);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  // Render day with shifts and roles
  const renderDay = (day, dayIndex) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayData = localSchedule[dayKey] || { shifts: [] };
    const dayOfWeek = format(day, 'EEEE');

    return (
      <Grid item xs={12} md={6} key={dayKey}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {dayOfWeek} - {format(day, 'MMM d')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => handleClearDay(dayKey)}
                  disabled={!dayData.shifts || dayData.shifts.length === 0}
                >
                  Clear Day
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedDay(dayKey);
                    setOpenShiftDialog(true);
                  }}
                >
                  Add Shift
                </Button>
              </Box>
            </Box>
            
            {dayData.shifts?.map((shift, shiftIndex) => (
              <Box key={shift.id || shiftIndex} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {shift.name}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => {
                      setSelectedDay(dayKey);
                      setSelectedShiftIndex(shiftIndex);
                      setSelectedShiftData(shift);
                      setOpenNotesDialog(true);
                    }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => {
                      // Remove shift
                      updateLocalSchedule(prev => ({
                        ...prev,
                        [dayKey]: {
                          ...prev[dayKey],
                          shifts: prev[dayKey].shifts.filter((_, i) => i !== shiftIndex)
                        }
                      }));
                    }}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                
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
                
                {/* Render required roles that need assignment */}
                {shift.requiredRoles?.map(roleId => {
                  const role = getRoleById(roleId);
                  const isAssigned = shift.assignedStaff?.[roleId];
                  return (
                    <Box key={roleId} sx={{ mb: 1 }}>
                      <Typography variant="body2" color={isAssigned ? 'success.main' : 'error.main'}>
                        {role?.name} {isAssigned ? '✓' : '✗'}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            ))}
            
            {(!dayData.shifts || dayData.shifts.length === 0) && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No shifts scheduled
              </Typography>
            )}
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
            startIcon={isAutoAssigning ? <StopIcon /> : <AssignmentIcon />}
            onClick={handleAutoAssign}
            disabled={isAutoAssigning}
          >
            {isAutoAssigning ? 'Auto Assigning...' : 'Auto Assign'}
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
          handleClearAssignments();
          setActionsMenuAnchor(null);
        }}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear Assignments</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          handleClearShifts();
          setActionsMenuAnchor(null);
        }}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear All Shifts</ListItemText>
        </MenuItem>
        
        <Divider />
        
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

      {/* Shift dialog placeholder */}
      <Dialog open={openShiftDialog} onClose={() => setOpenShiftDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Shift</DialogTitle>
        <DialogContent>
          <Typography>Shift creation dialog will be implemented here</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShiftDialog(false)}>Cancel</Button>
          <Button variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      {/* Notes dialog placeholder */}
      <Dialog open={openNotesDialog} onClose={() => setOpenNotesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Notes</DialogTitle>
        <DialogContent>
          <Typography>Notes editing dialog will be implemented here</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNotesDialog(false)}>Cancel</Button>
          <Button variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ScheduleBuilderTabNew;
