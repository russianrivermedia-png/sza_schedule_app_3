import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Collapse,
  Menu,
  ListItemIcon,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  AutoFixHigh as AutoAssignIcon,
  Warning as WarningIcon,
  MoreVert as MoreVertIcon,
  Notes as NotesIcon,
  AddCircle as AddCircleIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Refresh as RefreshIcon,
  Merge as MergeIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { scheduleHelpers, roleAssignmentsHelpers, timeOffHelpers } from '../lib/supabaseHelpers';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import DroppableRole from './DroppableRole';
import TourDisplay from './TourDisplay';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ScheduleBuilderTab() {
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
    // Use optimized lookup functions
    getStaffById,
    getRoleById,
    getTimeOffByStaffId,
    getActiveEditor,
    isWeekBeingEdited
  } = useData();
  
  const { user: currentUser } = useAuth();
  
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [weekSchedule, setWeekSchedule] = useState({});
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedShiftIndex, setSelectedShiftIndex] = useState(null);
  const [selectedShiftData, setSelectedShiftData] = useState(null);
  const [notes, setNotes] = useState('');
  const [expandedNotes, setExpandedNotes] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Shift assignment state
  const [selectedShifts, setSelectedShifts] = useState([]);

  // Actions menu state
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);

  // Add Role dialog state
  const [openAddRoleDialog, setOpenAddRoleDialog] = useState(false);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState('');

  // Performance optimization: Conflict cache
  const [conflictCache, setConflictCache] = useState(new Map());
  const [roleConflicts, setRoleConflicts] = useState(new Map());
  
  // Cache for time off conflicts by week
  const [timeOffConflictsCache, setTimeOffConflictsCache] = useState(new Map());
  
  // Multi-device collaboration state
  const [scheduleVersion, setScheduleVersion] = useState(null);
  const [isScheduleLocked, setIsScheduleLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState(null);
  const [lastModifiedBy, setLastModifiedBy] = useState(null);
  
  // Conflict resolution state
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [pendingChanges, setPendingChanges] = useState(null);

  // Get week dates
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 });
  const weekDates = DAYS_OF_WEEK.map((_, index) => addDays(weekStart, index));

  useEffect(() => {
    loadWeekSchedule();
    loadTimeOffConflicts();
  }, [selectedWeek, schedules, isSaving]);

  // Track active editor when week changes
  useEffect(() => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    // Set current user as active editor
    if (currentUser) {
      dispatch({
        type: 'SET_ACTIVE_EDITOR',
        payload: {
          weekKey,
          userId: currentUser.id,
          userName: currentUser.email || 'Unknown User',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Cleanup: Remove active editor when component unmounts or week changes
    return () => {
      if (currentUser) {
        dispatch({
          type: 'REMOVE_ACTIVE_EDITOR',
          payload: { weekKey }
        });
      }
    };
  }, [selectedWeek, currentUser, dispatch]);

  // Load time off conflicts for the current week
  const loadTimeOffConflicts = async () => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const weekEndDate = addDays(weekStart, 6);
    
    // Check cache first
    if (timeOffConflictsCache.has(weekKey)) {
      return timeOffConflictsCache.get(weekKey);
    }
    
    try {
      const conflicts = await timeOffHelpers.getConflictsForWeek(weekStart, weekEndDate);
      
      // Group conflicts by staff_id for faster lookup
      const conflictsByStaff = new Map();
      conflicts.forEach(conflict => {
        if (!conflictsByStaff.has(conflict.staff_id)) {
          conflictsByStaff.set(conflict.staff_id, []);
        }
        conflictsByStaff.get(conflict.staff_id).push(conflict);
      });
      
      // Cache the results
      setTimeOffConflictsCache(prev => new Map(prev).set(weekKey, conflictsByStaff));
      
      return conflictsByStaff;
    } catch (error) {
      console.error('Error loading time off conflicts:', error);
      return new Map();
    }
  };



  const loadWeekSchedule = () => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const existingSchedule = schedules.find(s => s.weekKey === weekKey);
    
    // console.log('Loading week schedule for:', weekKey);
    
    if (existingSchedule) {
      // Track version and locking info
      setScheduleVersion(existingSchedule.version || 1);
      setIsScheduleLocked(existingSchedule.is_locked || false);
      setLockedBy(existingSchedule.locked_by);
      setLastModifiedBy(existingSchedule.last_modified_by);
      
      // Extract the actual schedule data, excluding the metadata
      const { week_start, week_key, ...scheduleData } = existingSchedule.days || {};
      
      // Ensure all shifts have properly initialized assignedStaff objects
      const normalizedScheduleData = {};
      Object.keys(scheduleData).forEach(dayKey => {
        const dayData = scheduleData[dayKey];
        if (dayData && dayData.shifts) {
          normalizedScheduleData[dayKey] = {
            ...dayData,
            shifts: dayData.shifts.map(shift => ({
              ...shift,
              assignedStaff: shift.assignedStaff || {}
            }))
          };
        } else {
          normalizedScheduleData[dayKey] = dayData;
        }
      });
      
      // Ensure we have all 7 days of the week, fill in missing days
      const completeWeekData = {};
      weekDates.forEach(date => {
        const dayKey = format(date, 'yyyy-MM-dd');
        if (normalizedScheduleData[dayKey]) {
          completeWeekData[dayKey] = normalizedScheduleData[dayKey];
        } else {
          // Fill in missing day with empty shifts
          completeWeekData[dayKey] = {
            shifts: shifts.map(shift => ({
              ...shift,
              assignedStaff: {}
            }))
          };
        }
      });
      
      setWeekSchedule(completeWeekData);
    } else {
      // Reset version info for new schedule
      setScheduleVersion(null);
      setIsScheduleLocked(false);
      setLockedBy(null);
      setLastModifiedBy(null);
      
      // Create empty week structure with all 7 days
      const emptyWeekData = {};
      weekDates.forEach(date => {
        const dayKey = format(date, 'yyyy-MM-dd');
        emptyWeekData[dayKey] = {
          shifts: shifts.map(shift => ({
            ...shift,
            assignedStaff: {}
          }))
        };
      });
      setWeekSchedule(emptyWeekData);
    }
  };

    const saveWeekSchedule = async () => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const scheduleData = {
      days: {
        ...weekSchedule,
        week_start: weekStart.toISOString(),
        week_key: weekKey
      }
    };

    setIsSaving(true);
    try {
      const existingSchedule = schedules.find(s => s.weekKey === weekKey);
      if (existingSchedule) {
        // Update existing schedule with version control
        const updatedSchedule = await scheduleHelpers.update(
          existingSchedule.id, 
          scheduleData, 
          scheduleVersion, 
          currentUser?.id
        );
        
        // Update local version
        setScheduleVersion(updatedSchedule.version);
        setLastModifiedBy(updatedSchedule.last_modified_by);
      } else {
        // Create new schedule
        const newSchedule = await scheduleHelpers.add({
          ...scheduleData,
          last_modified_by: currentUser?.id
        });
        
        // Update local version
        setScheduleVersion(newSchedule.version);
        setLastModifiedBy(newSchedule.last_modified_by);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      
      // Handle specific error types
      if (error.message.includes('modified by another user')) {
        // Show conflict resolution dialog
        setConflictData({
          type: 'version_conflict',
          message: 'This schedule has been modified by another user.',
          details: 'Your changes conflict with changes made by another user. How would you like to resolve this?'
        });
        setPendingChanges(scheduleData);
        setConflictDialogOpen(true);
      } else if (error.message.includes('currently being edited')) {
        alert('This schedule is currently being edited by another user. Please try again in a few moments.');
      } else {
        alert(`Error saving schedule: ${error.message}. Please try again.`);
      }
    } finally {
      setIsSaving(false);
      
      // Reload data from context instead of page reload to maintain real-time sync
      dispatch({ type: 'RELOAD_SCHEDULES' });
    }
  };

  // Conflict resolution functions
  const handleConflictResolution = (resolution) => {
    if (resolution === 'overwrite') {
      // Force save with current changes
      saveWeekSchedule();
    } else if (resolution === 'reload') {
      // Reload latest data and discard local changes
      loadWeekSchedule();
    } else if (resolution === 'merge') {
      // Attempt to merge changes (basic implementation)
      attemptMergeChanges();
    }
    setConflictDialogOpen(false);
    setConflictData(null);
    setPendingChanges(null);
  };

  const attemptMergeChanges = async () => {
    try {
      // Get the latest schedule data
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const latestSchedule = await scheduleHelpers.getByWeek(weekKey);
      
      if (latestSchedule && latestSchedule.days) {
        // Merge local changes with latest data
        const mergedSchedule = { ...latestSchedule.days };
        
        // Apply local changes to the merged schedule
        Object.keys(weekSchedule).forEach(dayKey => {
          if (weekSchedule[dayKey] && weekSchedule[dayKey].shifts) {
            mergedSchedule[dayKey] = weekSchedule[dayKey];
          }
        });
        
        // Update the local schedule with merged data
        setWeekSchedule(mergedSchedule);
        
        // Save the merged schedule
        const scheduleData = {
          days: {
            ...mergedSchedule,
            week_start: weekStart.toISOString(),
            week_key: weekKey
          }
        };
        
        await scheduleHelpers.update(
          latestSchedule.id, 
          scheduleData, 
          latestSchedule.version, 
          currentUser?.id
        );
        
        alert('Changes merged successfully!');
      }
    } catch (error) {
      console.error('Error merging changes:', error);
      alert('Failed to merge changes. Please try again.');
    }
  };

  // Performance optimization: Clear conflict cache when relevant data changes
  useEffect(() => {
    setConflictCache(new Map());
  }, [timeOffRequests, weekSchedule]);

  // Log role assignment for tracking
  const logRoleAssignment = async (staffId, roleId, shiftId = null, tourId = null, weekKey = null, assignmentDate = null) => {
    try {
      const role = getRoleById(roleId);
      if (role) {
        await roleAssignmentsHelpers.add(
          staffId,
          role.name, // Store role name instead of ID for easier querying
          shiftId,
          tourId,
          weekKey,
          false, // isManual = false (automatic assignment)
          'Schedule Builder', // createdBy
          assignmentDate // Pass the actual assignment date
        );
      }
    } catch (error) {
      console.error('Error logging role assignment:', error);
      // Don't throw error - assignment logging shouldn't break the main functionality
    }
  };

  // Preload conflicts for all current assignments
  const preloadConflicts = useCallback(async () => {
    const newConflicts = new Map();
    
    for (const [dayKey, daySchedule] of Object.entries(weekSchedule)) {
      if (daySchedule.shifts) {
        for (const shift of daySchedule.shifts) {
          if (shift.assignedStaff) {
            for (const [roleId, staffId] of Object.entries(shift.assignedStaff)) {
              if (staffId) {
                const day = new Date(dayKey);
                const conflicts = await getStaffConflictsInternal(staffId, day, roleId);
                newConflicts.set(`${staffId}-${dayKey}-${roleId}`, conflicts);
              }
            }
          }
        }
      }
    }
    
    setRoleConflicts(newConflicts);
  }, [weekSchedule]);

  // Internal conflict checking function (without cache)
  const getStaffConflictsInternal = async (staffId, day, roleId) => {
    const conflicts = [];
    const staffMember = getStaffById(staffId);
    
    if (!staffMember) return conflicts;

    // Check availability
    const dayOfWeek = DAYS_OF_WEEK[day.getDay()];
    if (!(staffMember.availability || []).includes(dayOfWeek)) {
      conflicts.push('Not available on this day');
    }

    // Check time off conflicts - use fresh data from database
    try {
      const timeOffConflicts = await timeOffHelpers.getConflictsForStaffAndDate(staffId, day);
      if (timeOffConflicts && timeOffConflicts.length > 0) {
        conflicts.push('Has approved time off on this day');
      }
    } catch (error) {
      console.error('Error checking time off conflicts:', error);
      // Fallback to cached data if database call fails
      const cachedTimeOffConflicts = getTimeOffByStaffId(staffId);
      const hasTimeOff = cachedTimeOffConflicts.some(t => {
        const startDate = new Date(t.start_date);
        const endDate = new Date(t.end_date);
        const dayDate = new Date(day);
        return dayDate >= startDate && dayDate <= endDate && t.status === 'approved';
      });
      if (hasTimeOff) {
        conflicts.push('Has approved time off on this day');
      }
    }

    // Check for double-booking on the same day - use cached schedule data
    const dayKey = format(day, 'yyyy-MM-dd');
    
    // Use local weekSchedule data instead of making database calls
    const daySchedule = weekSchedule[dayKey];
    if (daySchedule && daySchedule.shifts) {
      let isAssignedToDifferentRole = false;
      let assignedRoles = [];
      
      daySchedule.shifts.forEach(shift => {
        Object.entries(shift.assignedStaff).forEach(([assignedRoleId, assignedStaffId]) => {
          // If this staff member is assigned to a different role on this day
          if (assignedStaffId === staffId) {
            assignedRoles.push(assignedRoleId);
            if (assignedRoleId !== roleId) {
              isAssignedToDifferentRole = true;
            }
          }
        });
      });
      
      if (isAssignedToDifferentRole) {
        conflicts.push('Already assigned to another role on this day');
      }
    }

    // Check role training
    if (!(staffMember.trained_roles || staffMember.trainedRoles || []).includes(roleId)) {
      conflicts.push('Not trained for this role');
    }

    // Check weekly shift limit - count current assignments in the week
    const currentWeekShifts = Object.values(weekSchedule).flatMap(day => 
      day.shifts?.flatMap(shift => 
        Object.values(shift.assignedStaff).filter(id => id === staffId)
      ) || []
    ).length;
    const targetShifts = staffMember.target_shifts || staffMember.targetShifts || 5;
    
    if (currentWeekShifts > targetShifts) {
      conflicts.push(`Exceeds target shifts (${currentWeekShifts}/${targetShifts})`);
    }

    return conflicts;
  };

  // Performance optimization: Cached conflict checking
  const getStaffConflicts = (staffId, day, roleId) => {
    // Create cache key
    const cacheKey = `${staffId}-${format(day, 'yyyy-MM-dd')}-${roleId}`;
    
    // Check preloaded conflicts first
    if (roleConflicts.has(cacheKey)) {
      return roleConflicts.get(cacheKey);
    }
    
    // Check cache second
    if (conflictCache.has(cacheKey)) {
      return conflictCache.get(cacheKey);
    }

    // Fallback to empty array if not found
    return [];
  };

  // Preload conflicts when weekSchedule changes
  useEffect(() => {
    if (Object.keys(weekSchedule).length > 0) {
      // Clear old cache first to prevent stale data
      setRoleConflicts(new Map());
      setConflictCache(new Map());
      preloadConflicts();
    }
  }, [weekSchedule]);

     const addShiftsToDay = (day, shiftIds) => {
     const dayKey = format(day, 'yyyy-MM-dd');
     const shiftsToAdd = shiftIds.map(shiftId => {
       const shift = (shifts || []).find(s => s.id === shiftId);
       if (!shift) return null;
       
              return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          shiftId,
          name: shift.name,
          requiredRoles: shift.required_roles || shift.requiredRoles || [],
          tours: shift.tours || [],
          tourColors: {},
          staffColors: {},
          assignedStaff: {},
          arrivalTime: '',
          notes: '',
        };
     }).filter(Boolean);

     const updatedDay = {
       ...weekSchedule[dayKey],
       shifts: [
         ...(weekSchedule[dayKey]?.shifts || []),
         ...shiftsToAdd
      ]
    };

    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));
  };

     const handleShiftSelection = (shiftId) => {
     setSelectedShifts(prev => {
       if (prev.includes(shiftId)) {
         return prev.filter(id => id !== shiftId);
       } else {
         return [...prev, shiftId];
       }
     });
   };

     const handleAddShifts = () => {
     if (selectedShifts.length === 0) return;
     
     addShiftsToDay(selectedDay, selectedShifts);
     
     // Reset and close
     setSelectedShifts([]);
     setOpenShiftDialog(false);
  };

  const removeShiftFromDay = (day, shiftIndex) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const updatedDay = {
      ...weekSchedule[dayKey],
      shifts: weekSchedule[dayKey].shifts.filter((_, index) => index !== shiftIndex)
    };

    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));
  };

  const addRoleToShift = (day, shiftIndex, roleId) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey];
    const shift = daySchedule.shifts[shiftIndex];
    
    // Check if role is already in the shift
    if ((shift.required_roles || shift.requiredRoles || []).includes(roleId)) {
      return; // Role already exists
    }
    
    const updatedShift = {
      ...shift,
      requiredRoles: [...(shift.required_roles || shift.requiredRoles || []), roleId]
    };
    
    const updatedShifts = [...daySchedule.shifts];
    updatedShifts[shiftIndex] = updatedShift;
    
    const updatedDay = {
      ...daySchedule,
      shifts: updatedShifts
    };

    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));
  };

  const handleStaffDrop = async (day, shiftIndex, roleId, staffId) => {
    try {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey];
    if (!daySchedule || !daySchedule.shifts || !daySchedule.shifts[shiftIndex]) {
      console.error('Invalid day schedule or shift:', { dayKey, daySchedule, shiftIndex });
      return;
    }
    const shift = daySchedule.shifts[shiftIndex];
    
    // Check if role is already filled
    const existingStaffId = (shift.assignedStaff || {})[roleId];
    
    // Check if staff is already assigned elsewhere on this day
    const isAlreadyAssignedToday = daySchedule.shifts.some(dayShift => 
      Object.values(dayShift.assignedStaff || {}).includes(staffId)
    );

            // Check target shifts before assignment
        const staffMember = getStaffById(staffId);
        if (staffMember) {
          const targetShifts = staffMember.target_shifts || staffMember.targetShifts || 5;

          // Count current week assignments from local schedule
          const staffWeekAssignments = Object.values(weekSchedule).reduce((count, day) => {
            if (day.shifts) {
              day.shifts.forEach(shift => {
                Object.values(shift.assignedStaff).forEach(assignedStaffId => {
                  if (assignedStaffId === staffId) {
                    count++;
                  }
                });
              });
            }
            return count;
          }, 0);

          console.log(`🔍 Target shifts check for ${staffMember.name}:`, {
            staffWeekAssignments,
            targetShifts
          });

          // Allow manual override with confirmation
          if (staffWeekAssignments >= targetShifts) {
            const override = window.confirm(
              `⚠️ TARGET SHIFTS REACHED: ${staffMember.name} has already been assigned ${staffWeekAssignments}/${targetShifts} shifts this week.\n\n` +
              `Do you want to override this limit and assign an additional shift?`
            );
            if (!override) {
              return;
            }
          }
        }
    
    // If this is a swap (both roles have staff), handle it properly
    if (existingStaffId && isAlreadyAssignedToday) {
      // Find where the staff being dropped is currently assigned
      let currentShiftIndex = -1;
      let currentRoleId = '';
      
      daySchedule.shifts.forEach((dayShift, idx) => {
        Object.entries(dayShift.assignedStaff || {}).forEach(([roleId, assignedStaffId]) => {
          if (assignedStaffId === staffId) {
            currentShiftIndex = idx;
            currentRoleId = roleId;
          }
        });
      });
      
      // Only perform swap if we found the staff in a different shift/role
      if (currentShiftIndex !== -1 && (currentShiftIndex !== shiftIndex || currentRoleId !== roleId)) {
        // This is a staff swap - both staff members switch positions
        const updatedShifts = [...daySchedule.shifts];
        
        // Update the current shift (where staff is being dropped)
        const updatedCurrentShift = {
          ...shift,
          assignedStaff: {
            ...shift.assignedStaff,
            [roleId]: staffId
          }
        };
        updatedShifts[shiftIndex] = updatedCurrentShift;
        
        // Update the other shift (where staff came from)
        const otherShift = updatedShifts[currentShiftIndex];
        const updatedOtherShift = {
          ...otherShift,
          assignedStaff: {
            ...otherShift.assignedStaff,
            [currentRoleId]: existingStaffId
          }
        };
        updatedShifts[currentShiftIndex] = updatedOtherShift;
        
        // Update the day schedule
        const updatedDay = {
          ...daySchedule,
          shifts: updatedShifts
        };
        
        setWeekSchedule(prev => ({
          ...prev,
          [dayKey]: updatedDay
        }));
        
        return; // Exit early - swap is complete
      }
    }
    
    // If not a swap, handle as replacement
    if (isAlreadyAssignedToday && !existingStaffId) {
      // Staff is assigned elsewhere today but not in this specific role
      const staffMember = (staff || []).find(s => s.id === staffId);
      
      // Find where they're currently assigned
      let currentAssignment = '';
      
      Object.values(daySchedule.shifts).forEach((dayShift, idx) => {
        Object.entries(dayShift.assignedStaff).forEach(([roleId, assignedStaffId]) => {
          if (assignedStaffId === staffId) {
            const role = (roles || []).find(r => r.id === roleId);
            currentAssignment = role?.name || 'Unknown Role';
          }
        });
      });
      
      // Show warning for double-booking
      const warningMessage = `Warning: ${staffMember?.name || 'This staff member'} is already assigned to ${currentAssignment} on ${format(day, 'EEEE, MMM d')}. \n\nThis will create a double-booking. Do you want to continue?`;
      
      if (!window.confirm(warningMessage)) {
        return; // User cancelled the assignment
      }
    }
    
    let updatedAssignedStaff = { ...shift.assignedStaff };
    
    if (existingStaffId) {
      // One-to-one swap: existing staff goes back to staff panel
      if (existingStaffId === staffId) {
        return; // Same staff, no change
      }
      
      // Remove existing staff from this role (they go back to staff panel)
      delete updatedAssignedStaff[roleId];
    }
    
    // Assign new staff to the role
    updatedAssignedStaff[roleId] = staffId;
    
    // Log role assignment for tracking
    if (staffId && (!existingStaffId || existingStaffId !== staffId)) {
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const shift = daySchedule.shifts[shiftIndex];
      const assignmentDate = day.toISOString(); // Use the actual shift date
      logRoleAssignment(staffId, roleId, shift.shiftId, null, weekKey, assignmentDate);
      
      // Increment shift count for the assigned staff member
      dispatch({
        type: 'UPDATE_STAFF_SHIFT_COUNT',
        payload: {
          staffId: staffId,
          roleId: roleId
        }
      });
    }
    
    // Check for time off conflicts first
    const role = getRoleById(roleId);
    
    if (staffMember) {
      // Check if staff has approved time off on this day
      const staffTimeOff = getTimeOffByStaffId(staffId);
      const hasTimeOffOnDay = staffTimeOff.some(timeOff => 
        timeOff.status === 'approved' &&
        new Date(timeOff.start_date) <= new Date(dayKey) &&
        new Date(timeOff.end_date) >= new Date(dayKey)
      );
      
      if (hasTimeOffOnDay) {
        const timeOffRequest = staffTimeOff.find(timeOff => 
          timeOff.status === 'approved' &&
          new Date(timeOff.start_date) <= new Date(dayKey) &&
          new Date(timeOff.end_date) >= new Date(dayKey)
        );
        
        const startDate = new Date(timeOffRequest.start_date).toLocaleDateString();
        const endDate = new Date(timeOffRequest.end_date).toLocaleDateString();
        
        const confirmAssignment = window.confirm(
          `⚠️ CONFLICT WARNING: ${staffMember.name} has approved time off from ${startDate} to ${endDate}.\n\n` +
          `Are you sure you want to assign them to work on ${new Date(dayKey).toLocaleDateString()}?`
        );
        
        if (!confirmAssignment) {
          console.log('Assignment cancelled due to time off conflict');
          return; // Cancel the assignment
        }
      }
      
      // Check for training conflicts and show warning if needed
      if (role && !(staffMember.trained_roles || staffMember.trainedRoles || []).includes(roleId)) {
        alert(`Warning: ${staffMember.name} is not trained for ${role.name}. Assignment allowed but may cause issues.`);
      }
    }
    
    console.log('Creating updated shift with assignedStaff:', updatedAssignedStaff);
    const updatedShift = {
      ...shift,
      assignedStaff: updatedAssignedStaff
    };
    
    const updatedShifts = [...daySchedule.shifts];
    updatedShifts[shiftIndex] = updatedShift;
    console.log('Updated shifts array:', updatedShifts);
    
    const updatedDay = {
      ...daySchedule,
      shifts: updatedShifts
    };
    
    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));
    
    console.log('Updated weekSchedule state:', {
      ...weekSchedule,
      [dayKey]: updatedDay
    });
    console.log('=== END HANDLE STAFF DROP ===');
    } catch (error) {
      console.error('Error in handleStaffDrop:', error);
      console.error('Error stack:', error.stack);
    }
  };

  const removeStaffFromRole = (day, shiftIndex, roleId) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey];
    const shift = daySchedule.shifts[shiftIndex];
    
    const updatedAssignedStaff = { ...shift.assignedStaff };
    delete updatedAssignedStaff[roleId];
    
    const updatedShift = {
      ...shift,
      assignedStaff: updatedAssignedStaff
    };
    
    const updatedShifts = [...daySchedule.shifts];
    updatedShifts[shiftIndex] = updatedShift;
    
    const updatedDay = {
      ...daySchedule,
      shifts: updatedShifts
    };
    
    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));
  };

  const handleArrivalTimeChange = (day, shiftIndex, time) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey];
    const shift = daySchedule.shifts[shiftIndex];
    
    const updatedShift = {
      ...shift,
      arrivalTime: time
    };
    
    const updatedShifts = [...daySchedule.shifts];
    updatedShifts[shiftIndex] = updatedShift;
    
    const updatedDay = {
      ...daySchedule,
      shifts: updatedShifts
    };
    
    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));
  };

  const handleTourColorChange = (day, shiftIndex, tourId, color) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey];
    const shift = daySchedule.shifts[shiftIndex];
    
    const updatedTourColors = { ...shift.tourColors };
    updatedTourColors[tourId] = color;
    
    const updatedShift = {
      ...shift,
      tourColors: updatedTourColors
    };
    
    const updatedShifts = [...daySchedule.shifts];
    updatedShifts[shiftIndex] = updatedShift;
    
    const updatedDay = {
      ...daySchedule,
      shifts: updatedShifts
    };
    
    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));
  };

  const handleStaffColorChange = (day, shiftIndex, staffId, color) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey];
    const shift = daySchedule.shifts[shiftIndex];
    
    const updatedStaffColors = { ...shift.staffColors } || {};
    updatedStaffColors[staffId] = color;
    
    const updatedShift = {
      ...shift,
      staffColors: updatedStaffColors
    };
    
    const updatedShifts = [...daySchedule.shifts];
    updatedShifts[shiftIndex] = updatedShift;
    
    const updatedDay = {
      ...daySchedule,
      shifts: updatedShifts
    };
    
    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));
  };

  const handleNotesChange = (day, shiftIndex, notes) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey];
    const shift = daySchedule.shifts[shiftIndex];
    
    const updatedShift = {
      ...shift,
      notes: notes
    };
    
    const updatedShifts = [...daySchedule.shifts];
    updatedShifts[shiftIndex] = updatedShift;
    
    const updatedDay = {
      ...daySchedule,
      shifts: updatedShifts
    };
    
    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));
  };

  const clearWeek = async () => {
    if (!window.confirm('Are you sure you want to clear all assignments for this week? This action cannot be undone.')) {
      return;
    }

    try {
      setIsClearing(true);
      
      // Calculate week start and end dates
      const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }); // Monday
      const weekEnd = addDays(weekStart, 6); // Sunday
      
      // Clear assignments from database
      console.log('🗑️ Clearing role assignments from database...');
      await roleAssignmentsHelpers.clearWeekAssignments(weekStart, weekEnd);
      
      // Clear local state - reset all assignments to empty
      console.log('🗑️ Clearing local schedule state...');
      const clearedSchedule = {};
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayKey = format(day, 'yyyy-MM-dd');
        clearedSchedule[dayKey] = {
          ...weekSchedule[dayKey],
          shifts: weekSchedule[dayKey]?.shifts?.map(shift => ({
            ...shift,
            assignedStaff: {}
          })) || []
        };
      }
      
      setWeekSchedule(clearedSchedule);
      
      // Save the cleared schedule to the database to ensure it persists
      console.log('💾 Saving cleared schedule to database...');
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      // Use the same save logic as saveWeekSchedule
      const scheduleData = {
        days: {
          ...clearedSchedule,
          week_start: weekStart.toISOString(),
          week_key: weekKey
        }
      };
      
      const existingSchedule = schedules.find(s => s.weekKey === weekKey);
      if (existingSchedule) {
        // Update existing schedule
        await scheduleHelpers.update(existingSchedule.id, scheduleData);
      } else {
        // Create new schedule
        await scheduleHelpers.add(scheduleData);
      }
      
      // Reload the week schedule to ensure consistency
      console.log('🔄 Reloading schedule from database...');
      await loadWeekSchedule();
      
      console.log('✅ Week cleared successfully');
    } catch (error) {
      console.error('Error clearing week:', error);
      alert('Error clearing week: ' + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  const autoAssignStaff = async () => {
    console.log('🚀 AUTO-ASSIGN STARTING...');
    console.log('🔍 Staff data:', staff.map(s => ({ name: s.name, availability: s.availability })));
    const nathan = staff.find(s => s.name.includes('Nathan'));
    const will = staff.find(s => s.name.includes('Will'));
    console.log('🔍 Nathan in staff:', nathan);
    console.log('🔍 Will in staff:', will);
    
    if (nathan) {
      console.log('🔍 NATHAN DETAILED DATA:', {
        name: nathan.name,
        availability: nathan.availability,
        availabilityType: typeof nathan.availability,
        availabilityIsArray: Array.isArray(nathan.availability),
        targetShifts: nathan.targetShifts,
        availabilityContents: nathan.availability?.join(', ') || 'N/A'
      });
    }
    
    if (will) {
      console.log('🔍 WILL DETAILED DATA:', {
        name: will.name,
        availability: will.availability,
        availabilityType: typeof will.availability,
        availabilityIsArray: Array.isArray(will.availability),
        targetShifts: will.targetShifts,
        availabilityContents: will.availability?.join(', ') || 'N/A'
      });
    }
    
    // Use the selected week's schedule data, not the current week's
    const newWeekSchedule = { ...weekSchedule };
    let totalRoles = 0;
    let assignedRoles = 0;
    let unassignedRoles = [];
    
    // Validate that we have complete week data
    const expectedDays = weekDates.map(d => format(d, 'yyyy-MM-dd'));
    const actualDays = Object.keys(newWeekSchedule);
    const missingDays = expectedDays.filter(day => !actualDays.includes(day));
    
    if (missingDays.length > 0) {
      console.error('❌ INCOMPLETE WEEK DATA DETECTED!');
      console.error('Missing days:', missingDays);
      alert(`Cannot auto-assign: Missing schedule data for ${missingDays.length} days (${missingDays.join(', ')}). Please ensure the schedule is complete for this week.`);
      return;
    }

    // Pre-load time off conflicts for the entire week to avoid repeated async calls
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const weekEndDate = addDays(weekStart, 6);
    
    // Debug: Log the week being processed
    console.log('🔍 Auto-assign: Processing week:', weekKey);
    console.log('🔍 Auto-assign: Selected week:', selectedWeek);
    console.log('🔍 Auto-assign: Week start:', weekStart);
    console.log('🔍 Auto-assign: Week dates:', expectedDays);
    console.log('🔍 Auto-assign: Schedule data keys:', actualDays);
    console.log('🔍 Auto-assign: weekSchedule keys:', Object.keys(weekSchedule));
    console.log('🔍 Auto-assign: newWeekSchedule keys:', Object.keys(newWeekSchedule));
    
    // Ensure we're only working on the selected week
    const selectedWeekKey = format(startOfWeek(selectedWeek, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    if (weekKey !== selectedWeekKey) {
      console.error('❌ WEEK MISMATCH: Auto-assign is trying to process wrong week!');
      console.error('Expected week:', selectedWeekKey);
      console.error('Processing week:', weekKey);
      alert(`Error: Auto-assign is trying to process the wrong week. Expected ${selectedWeekKey} but got ${weekKey}. Please refresh and try again.`);
      return;
    }
    let timeOffConflicts = new Map();
    
    try {
      timeOffConflicts = await timeOffHelpers.getConflictsForWeek(weekStart, weekEndDate);
      // Group by staff_id for faster lookup
      const conflictsByStaff = new Map();
      timeOffConflicts.forEach(conflict => {
        if (!conflictsByStaff.has(conflict.staff_id)) {
          conflictsByStaff.set(conflict.staff_id, []);
        }
        conflictsByStaff.get(conflict.staff_id).push(conflict);
      });
      timeOffConflicts = conflictsByStaff;
    } catch (error) {
      console.error('Error loading time off conflicts:', error);
    }

    // Get actual current week assignments from database to respect target shifts
    const weeklyStaffAssignments = new Map();
    const staffTargetShifts = new Map();
    
    // Initialize staff target shifts
    staff.forEach(s => {
      staffTargetShifts.set(s.id, s.targetShifts || 5);
      weeklyStaffAssignments.set(s.id, 0);
    });

    // Count assignments from the current week's schedule data (not database)
    // This ensures we only count assignments from the week being processed
    Object.values(newWeekSchedule).forEach(day => {
      if (day.shifts) {
        day.shifts.forEach(shift => {
          Object.values(shift.assignedStaff).forEach(staffId => {
            if (staffId) {
              weeklyStaffAssignments.set(staffId, (weeklyStaffAssignments.get(staffId) || 0) + 1);
            }
          });
        });
      }
    });
    
    console.log('🔍 Auto-assign: Weekly staff assignments from current week schedule:', Object.fromEntries(weeklyStaffAssignments));
    
    for (const dayKey of Object.keys(newWeekSchedule)) {
      const day = newWeekSchedule[dayKey];
      if (!day.shifts) continue;
      
      const dayOfWeek = DAYS_OF_WEEK[new Date(dayKey).getDay()];
      const dayDate = new Date(dayKey);
      
      // Track staff already assigned on this day to prevent double-booking
      const dayAssignedStaff = new Set();
      
      // First, add existing staff to the day's assigned set to prevent conflicts
      // This should be empty for a new week, but we check anyway
      day.shifts.forEach((shift, shiftIndex) => {
        Object.values(shift.assignedStaff).forEach(staffId => {
          if (staffId) {
            dayAssignedStaff.add(staffId);
          }
        });
      });
      
      // Debug: Log what staff are already assigned on this day
      if (dayAssignedStaff.size > 0) {
        console.log(`🔍 Day ${dayOfWeek} already has assigned staff:`, Array.from(dayAssignedStaff));
      } else {
        console.log(`🔍 Day ${dayOfWeek} has no existing assignments - ready for auto-assign`);
      }
      
      for (const [shiftIndex, shift] of day.shifts.entries()) {
        const updatedAssignedStaff = { ...shift.assignedStaff };
        
        // Process all roles for this shift
        const roleIds = shift.required_roles || shift.requiredRoles || [];
        for (const roleId of roleIds) {
          const role = getRoleById(roleId);
          console.log(`🔍 PROCESSING ROLE: ${role?.name || roleId} on ${dayOfWeek}`);
          totalRoles++;
          
          // Check if role is already assigned (preserve existing assignments)
          if (updatedAssignedStaff[roleId]) {
            assignedRoles++;
            continue; // Already assigned - leave as is
          }
          
          // Find best available staff for this role - synchronous filtering only
          const availableStaff = staff.filter(s => {
            const staffMember = getStaffById(s.id);
            if (!staffMember) return false;
            
            // Special debugging for Nathan and Will
            if (staffMember.name.includes('Nathan') || staffMember.name.includes('Will')) {
              console.log(`🔍 FILTERING ${staffMember.name} for ${dayOfWeek} (Role: ${role?.name || roleId}):`, {
                availability: staffMember.availability,
                dayOfWeek,
                isAvailable: staffMember.availability?.includes(dayOfWeek) || false,
                roleName: role?.name || roleId
              });
            }
            
            // Check if staff is trained for this role
            const isTrained = (staffMember.trained_roles || staffMember.trainedRoles || []).includes(roleId);
            if (!isTrained) return false;
            
            // Check availability for this day
            const staffAvailability = staffMember.availability || [];
            const isAvailable = staffAvailability.includes(dayOfWeek);
            
            // Debug availability for Nathan and Will
            if (staffMember.name === 'Nathan' || staffMember.name === 'Will') {
              console.log(`🔍 ${staffMember.name} availability check:`, {
                availability: staffAvailability,
                dayOfWeek,
                isAvailable,
                isArray: Array.isArray(staffAvailability),
                targetShifts: staffMember.targetShifts,
                currentWeekShifts: weeklyStaffAssignments.get(s.id) || 0
              });
            }
            
            // Debug all staff availability checks
            console.log(`🔍 ${staffMember.name} availability check:`, {
              availability: staffAvailability,
              dayOfWeek,
              isAvailable,
              isTrained,
              currentWeekShifts: weeklyStaffAssignments.get(s.id) || 0,
              targetShifts: staffMember.targetShifts,
              availabilityContents: staffAvailability.join(', ')
            });
            
            if (!isAvailable) {
              console.log(`❌ ${staffMember.name} NOT AVAILABLE on ${dayOfWeek} - availability: ${staffAvailability.join(', ')}`);
              return false;
            }
            
            // Check if already assigned on this day
            if (dayAssignedStaff.has(s.id)) {
              console.log(`❌ ${staffMember.name} ALREADY ASSIGNED on ${dayOfWeek}`);
              return false;
            }
            
            // Check if staff has reached their target shifts for the week
            const currentWeekShifts = weeklyStaffAssignments.get(s.id) || 0;
            const targetShifts = staffTargetShifts.get(s.id) || 5;
            if (currentWeekShifts >= targetShifts) return false;
            
            // Check time off conflicts (synchronous check using pre-loaded data)
            const staffTimeOffConflicts = timeOffConflicts.get(s.id) || [];
            const hasTimeOff = staffTimeOffConflicts.some(t => {
              const conflictStart = new Date(t.start_date);
              const conflictEnd = new Date(t.end_date);
              return dayDate >= conflictStart && dayDate <= conflictEnd;
            });
            if (hasTimeOff) return false;
            
            return true;
          });

          // Sort available staff by current week shifts (ascending) and then by target shifts
          availableStaff.sort((a, b) => {
            const aCurrentShifts = weeklyStaffAssignments.get(a.id) || 0;
            const bCurrentShifts = weeklyStaffAssignments.get(b.id) || 0;
            
            if (aCurrentShifts !== bCurrentShifts) {
              return aCurrentShifts - bCurrentShifts;
            }
            return (a.targetShifts || 5) - (b.targetShifts || 5);
          });
          
          // Try to assign staff to this role
          let roleAssigned = false;
          for (const staffMember of availableStaff) {
            // Double-check target shifts before assignment
            const currentWeekShifts = weeklyStaffAssignments.get(staffMember.id) || 0;
            const targetShifts = staffTargetShifts.get(staffMember.id) || 5;
            
            if (currentWeekShifts < targetShifts) {
              const role = getRoleById(roleId);
              console.log(`✅ ASSIGNING ${staffMember.name} to ${role?.name || roleId} on ${dayOfWeek} - availability: ${staffMember.availability?.join(', ') || 'N/A'}`);
              
              // Special debugging for ground shifts
              if (role?.name?.toLowerCase().includes('ground') || roleId?.toLowerCase().includes('ground')) {
                console.log(`🚨 GROUND SHIFT ASSIGNMENT: ${staffMember.name} assigned to ${role?.name || roleId} on ${dayOfWeek}`);
              }
              
              updatedAssignedStaff[roleId] = staffMember.id;
              dayAssignedStaff.add(staffMember.id); // Mark as assigned for this day
              weeklyStaffAssignments.set(staffMember.id, currentWeekShifts + 1); // Update weekly count
              assignedRoles++;
              roleAssigned = true;
              
              // Log role assignment for tracking
              const weekKey = format(weekStart, 'yyyy-MM-dd');
              const assignmentDate = dayDate.toISOString(); // Use the actual shift date
              logRoleAssignment(staffMember.id, roleId, shift.shiftId, null, weekKey, assignmentDate);
              
              // Increment shift count for the assigned staff member
              dispatch({
                type: 'UPDATE_STAFF_SHIFT_COUNT',
                payload: {
                  staffId: staffMember.id,
                  roleId: roleId
                }
              });
              
              break;
            }
          }
          
          // Track unassigned roles for reporting
          if (!roleAssigned) {
            const role = (roles || []).find(r => r.id === roleId);
            const dayDate = new Date(dayKey);
            unassignedRoles.push({
              day: format(dayDate, 'EEEE, MMM d'),
              shift: shift.name,
              role: role?.name || 'Unknown Role'
            });
          }
        }
        
        day.shifts[shiftIndex] = {
          ...shift,
          assignedStaff: updatedAssignedStaff
        };
      }
    }
    
    setWeekSchedule(newWeekSchedule);
    
         // Show results to user
     const unassignedCount = totalRoles - assignedRoles;
     if (unassignedCount > 0) {
       const message = `Auto-assignment complete! ${assignedRoles}/${totalRoles} roles assigned. ${unassignedCount} roles could not be assigned due to conflicts or insufficient available staff.\n\nConflicts include: training requirements, availability, time off requests, double-booking, and weekly shift limits.\n\nUnassigned roles have been logged to the console for review.`;
       alert(message);
       // Log unassigned roles for debugging
      if (unassignedRoles.length > 0) {
        console.log('Unassigned roles (due to conflicts):', unassignedRoles);
      }
     } else {
       alert(`Auto-assignment complete! All ${totalRoles} roles have been assigned without conflicts.`);
     }
  };

  

  const handleOpenNotesDialog = (day, shiftIndex, shiftData) => {
    setSelectedDay(day);
    setSelectedShiftIndex(shiftIndex);
    setSelectedShiftData(shiftData);
    setNotes(shiftData.notes || '');
    setOpenNotesDialog(true);
  };

  const handleSaveNotes = () => {
    if (selectedDay && selectedShiftIndex !== null) {
      handleNotesChange(selectedDay, selectedShiftIndex, notes);
      setOpenNotesDialog(false);
    }
  };

  const getShiftTours = (shift) => {
    if (!shift.tours || (shift.tours || []).length === 0) return [];
    return (shift.tours || []).map(tourId => (tours || []).find(t => t.id === tourId)).filter(Boolean);
  };

  const renderScheduleTable = (day, dayIndex) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey] || { shifts: [] };
    const dayOfWeek = DAYS_OF_WEEK[dayIndex];

    if (daySchedule.shifts.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography color="text.secondary">
            No shifts scheduled
          </Typography>
        </Box>
      );
    }

         // Separate shifts with tours from those without and sort alphabetically
     const shiftsWithTours = daySchedule.shifts
       .filter(shift => (shift.tours || []).length > 0)
       .sort((a, b) => a.name.localeCompare(b.name));
     const shiftsWithoutTours = daySchedule.shifts
       .filter(shift => (shift.tours || []).length === 0)
       .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <Box>
        {/* Tour-based shifts in table format */}
        {shiftsWithTours.length > 0 && (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
                  <TableCell width="12%">Arrival Time</TableCell>
                  <TableCell width="20%">Shift Title</TableCell>
                  <TableCell width="35%">Staff Assigned</TableCell>
                  <TableCell width="25%">Tours</TableCell>
                  <TableCell width="8%">Notes</TableCell>
                  <TableCell width="8%">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
                {shiftsWithTours.map((shift, shiftIndex) => {
              // Find the actual index in the original daySchedule.shifts array
              const actualShiftIndex = daySchedule.shifts.findIndex(s => s.id === shift.id);
              const shiftTemplate = (shifts || []).find(s => s.id === shift.shiftId);
              const shiftTours = getShiftTours(shift);
              const hasNotes = shift.notes && shift.notes.trim().length > 0;

              return (
                <React.Fragment key={shift.id}>
                  <TableRow>
                    <TableCell>
                      <TextField
                        size="small"
                        value={shift.arrivalTime || ''}
                        onChange={(e) => handleArrivalTimeChange(day, actualShiftIndex, e.target.value)}
                        placeholder="9:00 AM"
                        sx={{ width: '100%' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {shift.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(shift.required_roles || shift.requiredRoles || []).map(roleId => {
                              const role = getRoleById(roleId);
                          const assignedStaffId = shift.assignedStaff[roleId];
                              const assignedStaff = getStaffById(assignedStaffId);
                          const conflicts = assignedStaffId ? getStaffConflicts(assignedStaffId, day, roleId) : [];
                          

                          
                          return (
                            <Box key={roleId} sx={{ mb: 1 }}>
                              <DroppableRole
                                role={role}
                                assignedStaff={assignedStaff}
                                conflicts={conflicts}
                                onStaffDrop={(staffId) => handleStaffDrop(day, actualShiftIndex, roleId, staffId)}
                                onRemoveStaff={() => removeStaffFromRole(day, actualShiftIndex, roleId)}
                                staff={staff}
                                roles={roles}
                                timeOffRequests={timeOffRequests}
                                day={day}
                                onStaffColorChange={(staffId, color) => handleStaffColorChange(day, actualShiftIndex, staffId, color)}
                                staffColor={shift.staffColors?.[assignedStaffId] || 'gray'}
                                  />
                                  {!assignedStaffId && (
                                    <Chip
                                      label="Unassigned"
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                      sx={{ mt: 0.5, fontSize: '0.7rem' }}
                                    />
                                  )}
                            </Box>
                          );
                        })}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <TourDisplay
                        tours={shiftTours}
                        tourColors={shift.tourColors}
                        onTourColorChange={(tourId, color) => handleTourColorChange(day, actualShiftIndex, tourId, color)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {hasNotes && (
                        <Tooltip title={shift.notes} arrow>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleOpenNotesDialog(day, actualShiftIndex, shift)}
                          >
                            <NotesIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                          <IconButton
                        size="small"
                            onClick={(event) => {
                              setSelectedDay(day);
                              setSelectedShiftIndex(actualShiftIndex);
                              setSelectedShiftData(shift);
                              setNotes(shift.notes || '');
                              setActionsMenuAnchor(event.currentTarget);
                            }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
        )}

        {/* Non-tour shifts in compact boxes */}
        {shiftsWithoutTours.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Other Shifts
            </Typography>
                         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
               {shiftsWithoutTours.map((shift) => {
                 // Find the actual index in the original daySchedule.shifts array
                 const actualShiftIndex = daySchedule.shifts.findIndex(s => s.id === shift.id);
                 
                 return (
                   <Box
                     key={shift.id}
                     sx={{
                       border: '1px solid',
                       borderColor: 'divider',
                       borderRadius: 1,
                       p: 1.5,
                       minWidth: 250,
                       bgcolor: 'background.paper',
                       position: 'relative',
                     }}
                   >
                  {/* Actions menu for non-tour shifts */}
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                    onClick={(event) => {
                      setSelectedDay(day);
                      setSelectedShiftIndex(actualShiftIndex);
                      setSelectedShiftData(shift);
                      setNotes(shift.notes || '');
                      setActionsMenuAnchor(event.currentTarget);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pr: 3 }}>
                    <TextField
                      size="small"
                      value={shift.arrivalTime || ''}
                      onChange={(e) => handleArrivalTimeChange(day, actualShiftIndex, e.target.value)}
                      placeholder="9:00 AM"
                      sx={{ width: 80 }}
                    />
                    <Typography variant="body2" fontWeight="medium">
                      {shift.name}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    {(shift.required_roles || shift.requiredRoles || []).map(roleId => {
                      const role = getRoleById(roleId);
                      const assignedStaffId = shift.assignedStaff[roleId];
                      const assignedStaff = getStaffById(assignedStaffId);
                      const conflicts = assignedStaffId ? getStaffConflicts(assignedStaffId, day, roleId) : [];
                      
                      return (
                        <Box key={roleId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DroppableRole
                            role={role}
                            assignedStaff={assignedStaff}
                            conflicts={conflicts}
                            onStaffDrop={(staffId) => handleStaffDrop(day, actualShiftIndex, roleId, staffId)}
                            onRemoveStaff={() => removeStaffFromRole(day, actualShiftIndex, roleId)}
                            staff={staff}
                            roles={roles}
                            timeOffRequests={timeOffRequests}
                            day={day}
                            onStaffColorChange={(staffId, color) => handleStaffColorChange(day, actualShiftIndex, staffId, color)}
                            staffColor={shift.staffColors?.[assignedStaffId] || 'gray'}
                          />
                          {!assignedStaffId && (
                            <Chip
                              label="Unassigned"
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Notes indicator for non-tour shifts */}
                  {shift.notes && shift.notes.trim().length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tooltip title={shift.notes} arrow>
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleOpenNotesDialog(day, actualShiftIndex, shift)}
                        >
                          <NotesIcon />
                        </IconButton>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary">
                        Has notes
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography variant="h6">Loading schedule data...</Typography>
      </Box>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4">Schedule Builder</Typography>
            {/* Multi-device collaboration indicators */}
            {isScheduleLocked && lockedBy && lockedBy !== currentUser?.id && (
              <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
                ⚠️ This schedule is currently being edited by another user. Your changes may not be saved.
              </Alert>
            )}
            {lastModifiedBy && lastModifiedBy !== currentUser?.id && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Last modified by another user • Version {scheduleVersion}
              </Typography>
            )}
            {scheduleVersion && lastModifiedBy === currentUser?.id && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                ✓ You have the latest version • Version {scheduleVersion}
              </Typography>
            )}
            {/* Active editor indicator */}
            {(() => {
              const weekKey = format(weekStart, 'yyyy-MM-dd');
              const activeEditor = getActiveEditor(weekKey);
              const isBeingEdited = isWeekBeingEdited(weekKey);
              
              if (isBeingEdited && activeEditor && activeEditor.userId !== currentUser?.id) {
                return (
                  <Typography variant="caption" color="info.main" sx={{ display: 'block', mt: 0.5 }}>
                    👤 {activeEditor.userName} is currently editing this schedule
                  </Typography>
                );
              } else if (isBeingEdited && activeEditor && activeEditor.userId === currentUser?.id) {
                return (
                  <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                    ✓ You are currently editing this schedule
                  </Typography>
                );
              }
              return null;
            })()}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setSelectedWeek(prev => addDays(prev, -7))}
            >
              Previous Week
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedWeek(new Date())}
            >
              Current Week
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedWeek(prev => addDays(prev, 7))}
            >
              Next Week
            </Button>
            <Tooltip title={`Auto-assign staff for the week of ${format(weekStart, 'MMMM d, yyyy')}`}>
              <Button
                variant="contained"
                startIcon={<AutoAssignIcon />}
                onClick={autoAssignStaff}
                disabled={isScheduleLocked && lockedBy !== currentUser?.id}
              >
                Auto Assign
              </Button>
            </Tooltip>
            <Button
              variant="outlined"
              color="error"
              onClick={clearWeek}
              disabled={loading || isClearing || (isScheduleLocked && lockedBy !== currentUser?.id)}
            >
              {isClearing ? 'Clearing...' : 'Clear Week'}
            </Button>
            <Button
              variant="contained"
              onClick={saveWeekSchedule}
              disabled={isScheduleLocked && lockedBy !== currentUser?.id}
            >
              Save Schedule
            </Button>
          </Box>
        </Box>

        {/* Performance Metrics Display */}
        <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1, fontSize: '0.75rem' }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Performance:</strong> {(staff || []).length} staff • {(roles || []).length} roles • {(shifts || []).length} shifts • 
            Conflict cache: {conflictCache.size} entries • 
            <span style={{ color: 'green' }}>✓ Optimized lookups enabled</span>
          </Typography>
        </Box>

        <Typography variant="h6" sx={{ mb: 2 }}>
          Week of {format(weekStart, 'MMMM d, yyyy')}
        </Typography>

                   {/* Assignment Status Summary */}
          {(() => {
            const totalRoles = Object.values(weekSchedule).flatMap(day => 
              day.shifts?.flatMap(shift => shift.required_roles || shift.requiredRoles || []) || []
            ).length;
            const assignedRoles = Object.values(weekSchedule).flatMap(day => 
              day.shifts?.flatMap(shift => Object.values(shift.assignedStaff)) || []
            ).length;
            
            if (totalRoles > 0) {
              const unassignedCount = totalRoles - assignedRoles;
              const statusText = `Assignment Status: ${assignedRoles}/${totalRoles} roles assigned${unassignedCount > 0 ? ` • ${unassignedCount} role${unassignedCount !== 1 ? 's' : ''} still need${unassignedCount === 1 ? 's' : ''} assignment` : ''}`;
              
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Tooltip title={statusText} arrow placement="top">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {unassignedCount === 0 ? (
                        <Alert severity="success" sx={{ py: 0.5, px: 1, '& .MuiAlert-message': { py: 0 } }}>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                            ✓ All roles assigned
                          </Typography>
                        </Alert>
                      ) : (
                        <Alert severity="warning" sx={{ py: 0.5, px: 1, '& .MuiAlert-message': { py: 0 } }}>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                            ⚠ {unassignedCount} unassigned
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  </Tooltip>
                </Box>
              );
            }
            return null;
          })()}

                 <Box sx={{ display: 'flex', gap: 2 }}>
           {/* Main Schedule Content */}
           <Box sx={{ flexGrow: 1 }}>
        <Grid container spacing={2}>
          {weekDates.map((day, dayIndex) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const daySchedule = weekSchedule[dayKey] || { shifts: [] };
            const dayOfWeek = DAYS_OF_WEEK[dayIndex];
            
            return (
              <Grid item xs={12} key={dayKey}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        {dayOfWeek} - {format(day, 'MMM d')}
                      </Typography>
                                                       <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                                startIcon={<AddCircleIcon />}
                        onClick={() => {
                          setSelectedDay(day);
                          setOpenShiftDialog(true);
                        }}
                      >
                                Add Shifts
                      </Button>
                            </Box>
                    </Box>

                    {renderScheduleTable(day, dayIndex)}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
           </Box>

           
        </Box>

        

        {/* Add Shift Dialog */}
         <Dialog open={openShiftDialog} onClose={() => setOpenShiftDialog(false)} maxWidth="md" fullWidth>
           <DialogTitle>
             <Typography variant="h6">
               Add Shifts to {selectedDay ? format(selectedDay, 'EEEE, MMM d') : ''}
             </Typography>
           </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
               <Alert severity="info" sx={{ mb: 2 }}>
                 <Typography variant="body2">
                   Select shifts to add to {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'this day'}. 
                   You can select as many as you need.
                 </Typography>
               </Alert>
               
               {/* Select All Toggle */}
               <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                 <Box sx={{ mr: 2 }}>
                   {selectedShifts.length === shifts.length ? (
                     <CheckBoxIcon color="primary" />
                   ) : (
                     <CheckBoxOutlineBlankIcon />
                   )}
                 </Box>
                 <Typography 
                   variant="body2" 
                   sx={{ 
                     cursor: 'pointer', 
                     fontWeight: 'medium',
                     '&:hover': { color: 'primary.main' }
                   }}
                   onClick={() => {
                     if (selectedShifts.length === (shifts || []).length) {
                       setSelectedShifts([]); // Deselect all
                     } else {
                       setSelectedShifts((shifts || []).map(s => s.id)); // Select all
                     }
                   }}
                 >
                   {selectedShifts.length === (shifts || []).length ? 'Deselect All' : 'Select All'} ({selectedShifts.length}/{(shifts || []).length})
                 </Typography>
               </Box>
               
                               <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {(shifts || [])
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(shift => (
                  <Box
                    key={shift.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      border: '1px solid',
                      borderColor: selectedShifts.includes(shift.id) ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer',
                      bgcolor: selectedShifts.includes(shift.id) ? 'primary.50' : 'background.paper',
                      '&:hover': {
                        bgcolor: selectedShifts.includes(shift.id) ? 'primary.100' : 'grey.50',
                      }
                    }}
                    onClick={() => handleShiftSelection(shift.id)}
                  >
                    <Box sx={{ mr: 2 }}>
                      {selectedShifts.includes(shift.id) ? (
                        <CheckBoxIcon color="primary" />
                      ) : (
                        <CheckBoxOutlineBlankIcon />
                      )}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {shift.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {(shift.required_roles || shift.requiredRoles || []).length} role{(shift.required_roles || shift.requiredRoles || []).length !== 1 ? 's' : ''} required
                        {(shift.tours || []).length > 0 && ` • ${(shift.tours || []).length} tour${(shift.tours || []).length !== 1 ? 's' : ''} attached`}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              
              {selectedShifts.length > 0 && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>{selectedShifts.length} shift{selectedShifts.length !== 1 ? 's' : ''} selected</strong>
                  </Typography>
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenShiftDialog(false)}>Cancel</Button>
            <Button
               onClick={handleAddShifts}
              variant="contained"
               disabled={selectedShifts.length === 0}
               startIcon={<AddCircleIcon />}
            >
               Add {selectedShifts.length} Shift{selectedShifts.length !== 1 ? 's' : ''}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notes Dialog */}
        <Dialog open={openNotesDialog} onClose={() => setOpenNotesDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Notes for {selectedShiftData?.name} - {selectedDay ? format(selectedDay, 'EEEE, MMM d') : ''}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter any notes about this shift..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNotesDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveNotes} variant="contained">
              Save Notes
            </Button>
          </DialogActions>
        </Dialog>

          {/* Add Role Dialog */}
          <Dialog open={openAddRoleDialog} onClose={() => setOpenAddRoleDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
              Add Role to {selectedShiftData?.name} - {selectedDay ? format(selectedDay, 'EEEE, MMM d') : ''}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 1 }}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Select Role to Add</InputLabel>
                  <Select
                    value={selectedRoleToAdd}
                    onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                    label="Select Role to Add"
                  >
                    {roles
                      .filter(role => !(selectedShiftData?.required_roles || selectedShiftData?.requiredRoles || [])?.includes(role.id))
                      .map(role => (
                        <MenuItem key={role.id} value={role.id}>
                          {role.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                {selectedShiftData?.required_roles && (selectedShiftData.required_roles || selectedShiftData.requiredRoles || []).length > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Current roles:</strong> {(selectedShiftData.required_roles || selectedShiftData.requiredRoles || []).map(roleId => {
                        const role = (roles || []).find(r => r.id === roleId);
                        return role?.name || 'Unknown Role';
                      }).join(', ')}
                    </Typography>
                  </Alert>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAddRoleDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => {
                  if (selectedDay && selectedShiftIndex !== null && selectedRoleToAdd) {
                    addRoleToShift(selectedDay, selectedShiftIndex, selectedRoleToAdd);
                    setSelectedRoleToAdd('');
                    setOpenAddRoleDialog(false);
                  }
                }} 
                variant="contained"
                disabled={!selectedRoleToAdd}
              >
                Add Role
              </Button>
            </DialogActions>
          </Dialog>

         {/* Actions Menu */}
         <Menu
           anchorEl={actionsMenuAnchor}
           open={Boolean(actionsMenuAnchor)}
           onClose={() => setActionsMenuAnchor(null)}
           anchorOrigin={{
             vertical: 'bottom',
             horizontal: 'right',
           }}
           transformOrigin={{
             vertical: 'top',
             horizontal: 'right',
           }}
         >
                       <MenuItem onClick={() => {
              setOpenNotesDialog(true);
              setActionsMenuAnchor(null);
            }}>
              <ListItemIcon>
                <NotesIcon fontSize="small" />
              </ListItemIcon>
              Edit Notes
            </MenuItem>
            <MenuItem onClick={() => {
              if (selectedDay && selectedShiftIndex !== null) {
                removeShiftFromDay(selectedDay, selectedShiftIndex);
              }
              setActionsMenuAnchor(null);
            }}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              Remove Shift
            </MenuItem>
            <MenuItem onClick={() => {
              setOpenAddRoleDialog(true);
              setActionsMenuAnchor(null);
            }}>
              <ListItemIcon>
                <AddCircleIcon fontSize="small" />
              </ListItemIcon>
              Add Role
            </MenuItem>
         </Menu>

        {/* Conflict Resolution Dialog */}
        <Dialog open={conflictDialogOpen} onClose={() => setConflictDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Schedule Conflict Detected</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {conflictData?.message}
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {conflictData?.details}
            </Typography>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Choose how to resolve this conflict:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => handleConflictResolution('reload')}
                startIcon={<RefreshIcon />}
              >
                Reload Latest Data (Discard My Changes)
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleConflictResolution('overwrite')}
                startIcon={<SaveIcon />}
                color="warning"
              >
                Overwrite with My Changes
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleConflictResolution('merge')}
                startIcon={<MergeIcon />}
                color="primary"
              >
                Attempt to Merge Changes
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConflictDialogOpen(false)}>
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DndProvider>
  );
}

export default ScheduleBuilderTab;
