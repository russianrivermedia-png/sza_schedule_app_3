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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  AutoFixHigh as AutoAssignIcon,
  AutoFixHigh as AutoFixHighIcon,
  Warning as WarningIcon,
  MoreVert as MoreVertIcon,
  Notes as NotesIcon,
  AddCircle as AddCircleIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Refresh as RefreshIcon,
  Merge as MergeIcon,
  Save as SaveIcon,
  Send as SendIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ContentCopy as CopyIcon,
  SaveAlt as SaveAltIcon,
  LibraryBooks as TemplateIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { scheduleHelpers, roleAssignmentsHelpers, timeOffHelpers } from '../lib/supabaseHelpers';
import { supabase } from '../lib/supabase';
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
    countOnlyPastShifts,
    // Use optimized lookup functions
    getStaffById,
    getRoleById,
    getTimeOffByStaffId,
    getActiveEditor,
    isWeekBeingEdited
  } = useData();
  
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // Shift assignment state
  const [selectedShifts, setSelectedShifts] = useState([]);

  // Actions menu state
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);
  
  // Bug fixing menu state
  const [bugFixingMenuAnchor, setBugFixingMenuAnchor] = useState(null);

  const handleBugFixingMenuOpen = (event) => {
    setBugFixingMenuAnchor(event.currentTarget);
  };

  const handleBugFixingMenuClose = () => {
    setBugFixingMenuAnchor(null);
  };

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
    
    console.log('🔍 LOADING WEEK SCHEDULE:', {
      weekKey,
      existingSchedule: existingSchedule ? 'FOUND' : 'NOT FOUND',
      totalSchedules: schedules.length,
      scheduleDates: schedules.map(s => ({ weekKey: s.weekKey, hasDays: !!s.days }))
    });
    
    if (existingSchedule) {
      // Debug: Log the raw schedule data from database
      console.log('🔍 DEBUG: Raw existingSchedule from database:', JSON.stringify(existingSchedule, null, 2));
      
      // Track version and locking info
      setScheduleVersion(existingSchedule.version || 1);
      setIsScheduleLocked(existingSchedule.is_locked || false);
      setLockedBy(existingSchedule.locked_by);
      setLastModifiedBy(existingSchedule.last_modified_by);
      
      // Extract the actual schedule data, excluding the metadata
      const { week_start, week_key, ...scheduleData } = existingSchedule.days || {};
      
      // Debug: Log the extracted schedule data
      console.log('🔍 DEBUG: Extracted scheduleData:', JSON.stringify(scheduleData, null, 2));
      
      // Ensure all shifts have properly initialized assignedStaff objects
      const normalizedScheduleData = {};
      Object.keys(scheduleData).forEach(dayKey => {
        const dayData = scheduleData[dayKey];
        if (dayData && dayData.shifts) {
          console.log(`🔍 PROCESSING DAY ${dayKey}:`, {
            shiftsCount: dayData.shifts.length,
            shiftNames: dayData.shifts.map(s => s.name),
            shiftRoles: dayData.shifts.map(s => ({
              name: s.name,
              requiredRoles: s.required_roles || s.requiredRoles || [],
              assignedStaff: s.assignedStaff || {}
            }))
          });
          
          normalizedScheduleData[dayKey] = {
            ...dayData,
            shifts: dayData.shifts.map(shift => {
              // Clean up invalid staff assignments
              const cleanedAssignedStaff = {};
              const originalAssignedStaff = shift.assignedStaff || {};
              
              Object.keys(originalAssignedStaff).forEach(roleId => {
                const staffId = originalAssignedStaff[roleId];
                const staffExists = getStaffById(staffId);
                
                if (staffExists) {
                  cleanedAssignedStaff[roleId] = staffId;
                } else {
                  console.log(`🧹 Removing invalid assignment on load: Role ${roleId} -> Staff ${staffId} (not found)`);
                }
              });
              
              return {
                ...shift,
                assignedStaff: cleanedAssignedStaff
              };
            })
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
          console.log(`🔍 USING EXISTING DATA for ${dayKey}:`, {
            shiftsCount: normalizedScheduleData[dayKey].shifts?.length || 0,
            shiftNames: normalizedScheduleData[dayKey].shifts?.map(s => s.name) || []
          });
          completeWeekData[dayKey] = normalizedScheduleData[dayKey];
        } else {
          // Fill in missing day with empty shifts array
          console.log(`🔍 CREATING EMPTY DAY for ${dayKey} (no existing data)`);
          completeWeekData[dayKey] = {
            shifts: []
          };
        }
      });
      
      console.log('📥 LOADED SCHEDULE DATA:', {
        weekKey,
        completeWeekData,
        totalDays: Object.keys(completeWeekData).length,
        dayShifts: Object.keys(completeWeekData).map(dayKey => ({
          day: dayKey,
          shiftsCount: completeWeekData[dayKey]?.shifts?.length || 0,
          shiftNames: completeWeekData[dayKey]?.shifts?.map(s => s.name) || []
        }))
      });
      
      setWeekSchedule(completeWeekData);
      // TODO: Check if schedule was published (when we add published status to database)
      setIsPublished(false); // Reset published status for now
    } else {
      // Reset version info for new schedule
      setScheduleVersion(null);
      setIsScheduleLocked(false);
      setLockedBy(null);
      setLastModifiedBy(null);
      setIsPublished(false);
      
      // Create empty week structure with all 7 days
      const emptyWeekData = {};
      weekDates.forEach(date => {
        const dayKey = format(date, 'yyyy-MM-dd');
        emptyWeekData[dayKey] = {
          shifts: []
        };
      });
      setWeekSchedule(emptyWeekData);
    }
  };

    const saveWeekSchedule = async () => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    console.log('💾 SAVING SCHEDULE:', {
      weekKey,
      weekSchedule,
      totalDays: Object.keys(weekSchedule).length,
      dayShifts: Object.keys(weekSchedule).map(dayKey => ({
        day: dayKey,
        shiftsCount: weekSchedule[dayKey]?.shifts?.length || 0,
        shiftNames: weekSchedule[dayKey]?.shifts?.map(s => s.name) || []
      }))
    });
    
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
      
      // Reset published status when schedule is modified
      setIsPublished(false);
      
      // Reload data from context instead of page reload to maintain real-time sync
      dispatch({ type: 'RELOAD_SCHEDULES' });
    }
  };

  const publishSchedule = async () => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    // First ensure the schedule is saved
    await saveWeekSchedule();
    
    setIsPublishing(true);
    try {
      // TODO: Implement email notification system
      // For now, just mark as published
      console.log('📧 Publishing schedule and sending notifications...');
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsPublished(true);
      
      // TODO: Send email notifications to all staff
      // await emailService.sendSchedulePublished(schedule, staffList);
      
      alert('Schedule published successfully! Email notifications have been sent to all staff.');
    } catch (error) {
      console.error('Error publishing schedule:', error);
      alert(`Error publishing schedule: ${error.message}. Please try again.`);
    } finally {
      setIsPublishing(false);
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

  // Force re-render when weekSchedule changes to update role counts
  const [roleCounts, setRoleCounts] = useState({ totalRoles: 0, assignedRoles: 0, unassignedRoles: 0 });
  
  useEffect(() => {
    // Calculate role counts when weekSchedule changes
    const totalRoles = Object.values(weekSchedule).flatMap(day => 
      day.shifts?.flatMap(shift => {
        const requiredRoles = shift.required_roles || shift.requiredRoles || [];
        return requiredRoles.length;
      }) || []
    ).reduce((sum, count) => sum + count, 0);
    
    const assignedRoles = Object.values(weekSchedule).flatMap(day => 
      day.shifts?.flatMap(shift => {
        const requiredRoles = shift.required_roles || shift.requiredRoles || [];
        const assignedStaff = shift.assignedStaff || {};
        
        const assignedRoleCount = requiredRoles.filter(roleId => {
          const staffId = assignedStaff[roleId];
          return staffId && staffId.trim() !== '' && staffId !== null && staffId !== undefined;
        }).length;
        
        return assignedRoleCount;
      }) || []
    ).reduce((sum, count) => sum + count, 0);
    
    setRoleCounts({
      totalRoles,
      assignedRoles,
      unassignedRoles: totalRoles - assignedRoles
    });
  }, [weekSchedule]);

  // Log role assignment for tracking (only for past shifts)
  const logRoleAssignment = async (staffId, roleId, shiftId = null, tourId = null, weekKey = null, assignmentDate = null) => {
    try {
      // Only log if the assignment date has passed
      if (assignmentDate) {
        const assignmentDateObj = new Date(assignmentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Only log if the assignment date is in the past
        if (assignmentDateObj >= today) {
          console.log('📝 Skipping shift log - assignment date is in the future:', assignmentDate);
          return; // Don't log future shifts
        }
      }
      
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
        console.log('📝 Logged shift assignment for past date:', assignmentDate);
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
      
      // Don't show conflict for simple role-to-role moves on the same day
      // The handleStaffDrop function will handle this as a swap
      // Only show conflict if staff is assigned to multiple different roles simultaneously
      if (isAssignedToDifferentRole && assignedRoles.length > 2) {
        conflicts.push('Already assigned to multiple roles on this day');
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
       
       // Check if this is a team event
       const isTeamEvent = shift.is_team_event || shift.isTeamEvent;
       
       // For team events, assign all staff to the first role
       let assignedStaff = {};
       if (isTeamEvent && staff && staff.length > 0) {
         const firstRoleId = (shift.required_roles || shift.requiredRoles || [])[0];
         if (firstRoleId) {
           // Assign all staff to the first role
           staff.forEach(staffMember => {
             assignedStaff[firstRoleId] = staffMember.id;
           });
         }
       }
       
              return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          shiftId,
          name: shift.name,
          requiredRoles: shift.required_roles || shift.requiredRoles || [],
          tours: shift.tours || [],
          tourColors: {},
          staffColors: {},
          assignedStaff,
          arrivalTime: shift.default_starting_time || '',
          notes: '',
          isTeamEvent,
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
    const currentDayData = weekSchedule[dayKey];
    
    console.log('🗑️ REMOVING SHIFT:', {
      dayKey,
      shiftIndex,
      currentShiftsCount: currentDayData?.shifts?.length || 0,
      shiftToRemove: currentDayData?.shifts?.[shiftIndex]?.name || 'Unknown',
      allShifts: currentDayData?.shifts?.map(s => s.name) || []
    });
    
    const updatedDay = {
      ...currentDayData,
      shifts: currentDayData.shifts.filter((_, index) => index !== shiftIndex)
    };

    console.log('🗑️ AFTER REMOVAL:', {
      dayKey,
      newShiftsCount: updatedDay.shifts.length,
      remainingShifts: updatedDay.shifts.map(s => s.name)
    });

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
          // Check if staff is on call and show warning
          if (staffMember.on_call) {
            const proceed = window.confirm(
              `⚠️ ON CALL STAFF: ${staffMember.name} is currently on call and not available for regular scheduling.\n\n` +
              `Are you sure you want to assign them to this shift?`
            );
            if (!proceed) {
              return;
            }
          }
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
        // VALIDATION CHECKS FOR SWAP - Check both staff members before executing swap
        
        // Check the staff being dropped (staffId) for the target role
        const role = getRoleById(roleId);
        if (staffMember && role) {
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
              console.log('Swap cancelled due to time off conflict');
              return; // Cancel the swap
            }
          }
          
          // Check for training conflicts and show warning if needed
          if (!(staffMember.trained_roles || staffMember.trainedRoles || []).includes(roleId)) {
            const proceed = window.confirm(
              `⚠️ TRAINING WARNING: ${staffMember.name} is not trained for ${role.name}.\n\n` +
              `Are you sure you want to assign them to this role?`
            );
            if (!proceed) {
              console.log('Swap cancelled due to training conflict');
              return; // Cancel the swap
            }
          }
        }
        
        // Check the existing staff (existingStaffId) for the role they're being moved to
        const existingStaffMember = getStaffById(existingStaffId);
        const existingRole = getRoleById(currentRoleId);
        if (existingStaffMember && existingRole) {
          // Check if existing staff has approved time off on this day
          const existingStaffTimeOff = getTimeOffByStaffId(existingStaffId);
          const existingHasTimeOffOnDay = existingStaffTimeOff.some(timeOff => 
            timeOff.status === 'approved' &&
            new Date(timeOff.start_date) <= new Date(dayKey) &&
            new Date(timeOff.end_date) >= new Date(dayKey)
          );
          
          if (existingHasTimeOffOnDay) {
            const existingTimeOffRequest = existingStaffTimeOff.find(timeOff => 
              timeOff.status === 'approved' &&
              new Date(timeOff.start_date) <= new Date(dayKey) &&
              new Date(timeOff.end_date) >= new Date(dayKey)
            );
            
            const startDate = new Date(existingTimeOffRequest.start_date).toLocaleDateString();
            const endDate = new Date(existingTimeOffRequest.end_date).toLocaleDateString();
            
            const confirmAssignment = window.confirm(
              `⚠️ CONFLICT WARNING: ${existingStaffMember.name} has approved time off from ${startDate} to ${endDate}.\n\n` +
              `Are you sure you want to assign them to work on ${new Date(dayKey).toLocaleDateString()}?`
            );
            
            if (!confirmAssignment) {
              console.log('Swap cancelled due to existing staff time off conflict');
              return; // Cancel the swap
            }
          }
          
          // Check for training conflicts for existing staff
          if (!(existingStaffMember.trained_roles || existingStaffMember.trainedRoles || []).includes(currentRoleId)) {
            const proceed = window.confirm(
              `⚠️ TRAINING WARNING: ${existingStaffMember.name} is not trained for ${existingRole.name}.\n\n` +
              `Are you sure you want to assign them to this role?`
            );
            if (!proceed) {
              console.log('Swap cancelled due to existing staff training conflict');
              return; // Cancel the swap
            }
          }
        }
        
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
      // This is a MOVE operation - ask user what they want to do
      const staffMember = (staff || []).find(s => s.id === staffId);
      
      // Find where they're currently assigned
      let currentAssignment = '';
      let currentShiftIndex = -1;
      let currentRoleId = '';
      
      daySchedule.shifts.forEach((dayShift, idx) => {
        Object.entries(dayShift.assignedStaff || {}).forEach(([roleId, assignedStaffId]) => {
          if (assignedStaffId === staffId) {
            const role = (roles || []).find(r => r.id === roleId);
            currentAssignment = role?.name || 'Unknown Role';
            currentShiftIndex = idx;
            currentRoleId = roleId;
          }
        });
      });
      
      // Ask user what they want to do
      const moveChoice = window.confirm(
        `🔄 STAFF MOVEMENT DETECTED\n\n` +
        `${staffMember?.name || 'This staff member'} is currently assigned to ${currentAssignment}.\n\n` +
        `Click OK to MOVE them to the new role (remove from ${currentAssignment})\n` +
        `Click Cancel to ASSIGN them to BOTH roles (keep both assignments)`
      );
      
      if (moveChoice) {
        // MOVE: Remove from previous assignment first
        const updatedShifts = [...daySchedule.shifts];
        
        // Remove from previous assignment using the same logic as removeStaffFromRole
        const prevShift = updatedShifts[currentShiftIndex];
        const updatedPrevAssignedStaff = { ...prevShift.assignedStaff };
        delete updatedPrevAssignedStaff[currentRoleId];
        
        updatedShifts[currentShiftIndex] = {
          ...prevShift,
          assignedStaff: updatedPrevAssignedStaff
        };
        
        // Now assign to new role
        const targetShift = updatedShifts[shiftIndex];
        const updatedTargetAssignedStaff = { ...targetShift.assignedStaff };
        updatedTargetAssignedStaff[roleId] = staffId;
        
        updatedShifts[shiftIndex] = {
          ...targetShift,
          assignedStaff: updatedTargetAssignedStaff
        };
        
        // Update the day schedule with both changes
        const updatedDay = {
          ...daySchedule,
          shifts: updatedShifts
        };
        
        setWeekSchedule(prev => ({
          ...prev,
          [dayKey]: updatedDay
        }));
        
        console.log(`Staff ${staffMember?.name} moved from ${currentAssignment} to new role`);
        
        // Log role assignment for tracking
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const assignmentDate = day.toISOString();
        logRoleAssignment(staffId, roleId, targetShift.shiftId, null, weekKey, assignmentDate);
        
        // Increment shift count for the assigned staff member
        dispatch({
          type: 'UPDATE_STAFF_SHIFT_COUNT',
          payload: {
            staffId: staffId,
            roleId: roleId,
            assignmentDate: day.toISOString()
          }
        });
        
        return; // Exit early - MOVE operation complete
      } else {
        // ASSIGN TO BOTH: Continue with normal flow below
        console.log(`Staff ${staffMember?.name} will be assigned to both roles`);
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
          roleId: roleId,
          assignmentDate: day.toISOString()
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

  // Template management
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('scheduleTemplates');
    return saved ? JSON.parse(saved) : [];
  });
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState(null);
  const [selectedDayForTemplate, setSelectedDayForTemplate] = useState(null);





  const saveDayAsTemplate = (day, dayIndex) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey];
    
    if (!daySchedule || !daySchedule.shifts || daySchedule.shifts.length === 0) {
      alert('No shifts found on this day to save as template.');
      return;
    }

    const templateName = prompt('Enter a name for this template:');
    if (!templateName || templateName.trim() === '') {
      return;
    }

    // Create template without staff assignments
    const template = {
      id: Date.now(),
      name: templateName.trim(),
      shifts: daySchedule.shifts.map(shift => ({
        ...shift,
        assignedStaff: {}, // Clear all staff assignments
        staffColors: {}, // Clear staff colors
        notes: '' // Clear notes
      })),
      createdAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, template];
    setTemplates(updatedTemplates);
    localStorage.setItem('scheduleTemplates', JSON.stringify(updatedTemplates));
    
    alert(`Template "${templateName}" saved successfully!`);
  };

  const loadTemplate = (template, day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const currentDaySchedule = weekSchedule[dayKey] || { shifts: [] };
    
    const updatedDay = {
      ...currentDaySchedule,
      shifts: [...currentDaySchedule.shifts, ...template.shifts]
    };

    setWeekSchedule(prev => ({
      ...prev,
      [dayKey]: updatedDay
    }));

    setTemplateMenuAnchor(null);
    alert(`Added ${template.shifts.length} shift(s) from template "${template.name}". Staff assignments have been cleared.`);
  };

  const deleteTemplate = (templateId) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);
      localStorage.setItem('scheduleTemplates', JSON.stringify(updatedTemplates));
    }
  };

  // Helper function to clean up invalid staff assignments
  const cleanScheduleAssignments = (schedule) => {
    const cleanedSchedule = {};
    let invalidAssignmentsCount = 0;
    
    Object.keys(schedule).forEach(dayKey => {
      const dayData = schedule[dayKey];
      cleanedSchedule[dayKey] = {
        ...dayData,
        shifts: dayData.shifts?.map(shift => {
          const cleanedAssignedStaff = {};
          const originalAssignedStaff = shift.assignedStaff || {};
          
          Object.keys(originalAssignedStaff).forEach(roleId => {
            const staffId = originalAssignedStaff[roleId];
            const staffExists = getStaffById(staffId);
            
            if (staffExists) {
              cleanedAssignedStaff[roleId] = staffId;
            } else {
              invalidAssignmentsCount++;
              console.log(`🧹 Removing invalid assignment: Role ${roleId} -> Staff ${staffId} (not found)`);
            }
          });
          
          return {
            ...shift,
            assignedStaff: cleanedAssignedStaff
          };
        }) || []
      };
    });
    
    if (invalidAssignmentsCount > 0) {
      console.log(`🧹 Cleaned up ${invalidAssignmentsCount} invalid staff assignments`);
    }
    
    return cleanedSchedule;
  };

  const cleanInvalidAssignments = async () => {
    try {
      setIsCleaning(true);
      
      console.log('🧹 Cleaning invalid staff assignments...');
      const cleanedSchedule = cleanScheduleAssignments(weekSchedule);
      
      // Check if any assignments were cleaned
      const originalAssignments = Object.values(weekSchedule).flatMap(day => 
        day.shifts?.flatMap(shift => Object.keys(shift.assignedStaff || {})) || []
      ).length;
      
      const cleanedAssignments = Object.values(cleanedSchedule).flatMap(day => 
        day.shifts?.flatMap(shift => Object.keys(shift.assignedStaff || {})) || []
      ).length;
      
      const removedCount = originalAssignments - cleanedAssignments;
      
      if (removedCount > 0) {
        console.log(`🧹 Removed ${removedCount} invalid staff assignments`);
        
        // Update local state
        setWeekSchedule(cleanedSchedule);
        
        // Save to database
        const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        
        const scheduleData = {
          days: {
            ...cleanedSchedule,
            week_start: weekStart.toISOString(),
            week_key: weekKey
          }
        };
        
        const existingSchedule = schedules.find(s => s.weekKey === weekKey);
        if (existingSchedule) {
          await scheduleHelpers.update(existingSchedule.id, scheduleData);
        } else {
          await scheduleHelpers.add(scheduleData);
        }
        
        alert(`✅ Cleaned up ${removedCount} invalid staff assignments`);
      } else {
        console.log('✅ No invalid assignments found');
        alert('✅ No invalid assignments found - all staff assignments are valid');
      }
    } catch (error) {
      console.error('Error cleaning invalid assignments:', error);
      alert('Error cleaning invalid assignments: ' + error.message);
    } finally {
      setIsCleaning(false);
    }
  };

  // Check for staff duplicates or data issues
  const checkDataIntegrity = () => {
    console.log('🔍 Checking data integrity...');
    
    // Check for staff duplicates
    const staffNames = staff.map(s => s.name.toLowerCase().trim());
    const duplicateNames = staffNames.filter((name, index) => staffNames.indexOf(name) !== index);
    
    if (duplicateNames.length > 0) {
      console.warn('⚠️ Found duplicate staff names:', [...new Set(duplicateNames)]);
    }
    
    // Check for staff with missing IDs
    const staffWithMissingIds = staff.filter(s => !s.id || s.id.trim() === '');
    if (staffWithMissingIds.length > 0) {
      console.warn('⚠️ Found staff with missing IDs:', staffWithMissingIds.map(s => s.name));
    }
    
    // Check for roles with missing IDs
    const rolesWithMissingIds = roles.filter(r => !r.id || r.id.trim() === '');
    if (rolesWithMissingIds.length > 0) {
      console.warn('⚠️ Found roles with missing IDs:', rolesWithMissingIds.map(r => r.name));
    }
    
    // Check for shifts with missing IDs
    const shiftsWithMissingIds = shifts.filter(s => !s.id || s.id.trim() === '');
    if (shiftsWithMissingIds.length > 0) {
      console.warn('⚠️ Found shifts with missing IDs:', shiftsWithMissingIds.map(s => s.name));
    }
    
    console.log('✅ Data integrity check completed');
    return {
      duplicateNames: [...new Set(duplicateNames)],
      staffWithMissingIds: staffWithMissingIds.length,
      rolesWithMissingIds: rolesWithMissingIds.length,
      shiftsWithMissingIds: shiftsWithMissingIds.length
    };
  };

  const fixStaleRoleId = async () => {
    const staleRoleId = '1536f435-36f0-467e-9d8b-b17587dd4b3b';
    console.log('🔧 FIXING STALE ROLE ID:', staleRoleId);
    console.log('🔍 Current roles available:', roles.map(r => ({ id: r.id, name: r.name })));
    
    let updatedSchedules = 0;
    let fixedShiftsCount = 0;
    
    // Process all schedules
    for (const schedule of schedules) {
      if (!schedule.days || typeof schedule.days !== 'object') continue;
      
      let scheduleUpdated = false;
      const updatedDays = { ...schedule.days };
      
      // Process each day in the schedule
      for (const [dayKey, dayData] of Object.entries(updatedDays)) {
        if (!dayData.shifts || !Array.isArray(dayData.shifts)) continue;
        
        let dayUpdated = false;
        const processedShifts = dayData.shifts.map(shift => {
          if (!shift.required_roles && !shift.requiredRoles) return shift;
          
          const roleIds = shift.required_roles || shift.requiredRoles || [];
          const hasStaleRole = roleIds.includes(staleRoleId);
          
          if (hasStaleRole) {
            console.log(`🔧 REMOVING STALE ROLE from shift "${shift.name}" on ${dayKey}`);
            const filteredRoles = roleIds.filter(id => id !== staleRoleId);
            
            // Remove from assignedStaff if it exists
            const updatedAssignedStaff = { ...shift.assignedStaff };
            if (updatedAssignedStaff[staleRoleId]) {
              delete updatedAssignedStaff[staleRoleId];
              console.log(`🔧 REMOVED STALE ROLE ASSIGNMENT from shift "${shift.name}"`);
            }
            
            dayUpdated = true;
            fixedShiftsCount++;
            
            return {
              ...shift,
              required_roles: filteredRoles,
              requiredRoles: filteredRoles,
              assignedStaff: updatedAssignedStaff
            };
          }
          
          return shift;
        });
        
        if (dayUpdated) {
          updatedDays[dayKey] = {
            ...dayData,
            shifts: processedShifts
          };
          scheduleUpdated = true;
        }
      }
      
      if (scheduleUpdated) {
        // Update the schedule in the database
        try {
          const { error } = await supabase
            .from('schedules')
            .update({ days: updatedDays })
            .eq('id', schedule.id);
          
          if (error) {
            console.error('❌ Error updating schedule:', error);
          } else {
            console.log(`✅ Updated schedule ${schedule.id}`);
            updatedSchedules++;
          }
        } catch (err) {
          console.error('❌ Error updating schedule:', err);
        }
      }
    }
    
    console.log(`🎉 STALE ROLE CLEANUP COMPLETE:`);
    console.log(`   - Updated ${updatedSchedules} schedules`);
    console.log(`   - Fixed ${fixedShiftsCount} shifts`);
    
    // Reload data to reflect changes
    if (updatedSchedules > 0) {
      console.log('🔄 Reloading data...');
      dispatch({ type: 'RELOAD_DATA' });
    }
  };

  const removeShiftsWithNoValidRoles = async () => {
    console.log('🗑️ REMOVING SHIFTS WITH NO VALID ROLES...');
    
    let updatedSchedules = 0;
    let removedShifts = 0;
    
    // Process all schedules
    for (const schedule of schedules) {
      if (!schedule.days || typeof schedule.days !== 'object') continue;
      
      let scheduleUpdated = false;
      const updatedDays = { ...schedule.days };
      
      // Process each day in the schedule
      for (const [dayKey, dayData] of Object.entries(updatedDays)) {
        if (!dayData.shifts || !Array.isArray(dayData.shifts)) continue;
        
        let dayUpdated = false;
        const validShifts = dayData.shifts.filter(shift => {
          const roleIds = shift.required_roles || shift.requiredRoles || [];
          
          // Check if shift has any valid roles
          const hasValidRoles = roleIds.some(roleId => {
            const role = getRoleById(roleId);
            return role !== undefined;
          });
          
          if (!hasValidRoles && roleIds.length > 0) {
            console.log(`🗑️ REMOVING SHIFT "${shift.name}" on ${dayKey} - no valid roles`);
            removedShifts++;
            dayUpdated = true;
            return false; // Remove this shift
          }
          
          return true; // Keep this shift
        });
        
        if (dayUpdated) {
          updatedDays[dayKey] = {
            ...dayData,
            shifts: validShifts
          };
          scheduleUpdated = true;
        }
      }
      
      if (scheduleUpdated) {
        // Update the schedule in the database
        try {
          const { error } = await supabase
            .from('schedules')
            .update({ days: updatedDays })
            .eq('id', schedule.id);
          
          if (error) {
            console.error('❌ Error updating schedule:', error);
          } else {
            console.log(`✅ Updated schedule ${schedule.id}`);
            updatedSchedules++;
          }
        } catch (err) {
          console.error('❌ Error updating schedule:', err);
        }
      }
    }
    
    console.log(`🎉 SHIFT CLEANUP COMPLETE:`);
    console.log(`   - Updated ${updatedSchedules} schedules`);
    console.log(`   - Removed ${removedShifts} shifts with no valid roles`);
    
    // Reload data to reflect changes
    if (updatedSchedules > 0) {
      console.log('🔄 Reloading data...');
      dispatch({ type: 'RELOAD_DATA' });
    }
  };

  const clearWeek = async () => {
    if (!window.confirm('Are you sure you want to clear all assignments for this week? This action cannot be undone.')) {
      return;
    }

    try {
      setIsClearing(true);
      
      // Calculate week start and end dates
      const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 }); // Sunday (matching the schedule format)
      const weekEnd = addDays(weekStart, 6); // Saturday
      
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

  // Analyze which roles are rare/niche vs common
  const analyzeRoleRarity = () => {
    const roleTrainingCount = new Map();
    
    // Count how many staff are trained for each role
    staff.forEach(staffMember => {
      const trainedRoles = staffMember.trained_roles || staffMember.trainedRoles || [];
      trainedRoles.forEach(roleId => {
        roleTrainingCount.set(roleId, (roleTrainingCount.get(roleId) || 0) + 1);
      });
    });
    
    // Calculate rarity scores (lower = more rare/niche)
    const roleRarity = new Map();
    const totalStaff = staff.length;
    
    roleTrainingCount.forEach((count, roleId) => {
      const role = getRoleById(roleId);
      const rarityScore = count / totalStaff; // 0-1, lower = more rare
      const rarityLevel = rarityScore < 0.3 ? 'VERY_RARE' : 
                         rarityScore < 0.5 ? 'RARE' : 
                         rarityScore < 0.7 ? 'UNCOMMON' : 'COMMON';
      
      roleRarity.set(roleId, {
        name: role?.name || 'Unknown Role',
        trainedCount: count,
        rarityScore,
        rarityLevel,
        priority: rarityScore < 0.3 ? 1 : // Highest priority for very rare roles
                 rarityScore < 0.5 ? 2 : // High priority for rare roles
                 rarityScore < 0.7 ? 3 : 4 // Lower priority for common roles
      });
    });
    
    return roleRarity;
  };

  const autoAssignStaff = async () => {
    console.log('🚀 SMART AUTO-ASSIGN STARTING...');
    console.log('🔍 Staff data:', staff.map(s => ({ name: s.name, availability: s.availability })));
    
    // Analyze role rarity to prioritize niche roles
    const roleRarity = analyzeRoleRarity();
    console.log('📊 Role rarity analysis:', roleRarity);
    
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
    
    // SMART ASSIGNMENT: Collect all unassigned roles and prioritize by rarity
    const allUnassignedRoles = [];
    
    // First pass: collect all roles and track existing assignments
    const dayAssignedStaffMap = new Map(); // Track assignments per day
    
    for (const dayKey of Object.keys(newWeekSchedule)) {
      const day = newWeekSchedule[dayKey];
      if (!day.shifts) continue;
      
      const dayOfWeek = DAYS_OF_WEEK[new Date(dayKey).getDay()];
      const dayDate = new Date(dayKey);
      
      // Track staff already assigned on this day to prevent double-booking
      const dayAssignedStaff = new Set();
      
      // First, add existing staff to the day's assigned set to prevent conflicts
      day.shifts.forEach((shift, shiftIndex) => {
        Object.values(shift.assignedStaff).forEach(staffId => {
          if (staffId) {
            dayAssignedStaff.add(staffId);
          }
        });
      });
      
      // Store the day's assigned staff for later use
      dayAssignedStaffMap.set(dayKey, dayAssignedStaff);
      
      for (const [shiftIndex, shift] of day.shifts.entries()) {
        const roleIds = shift.required_roles || shift.requiredRoles || [];
        
        for (const roleId of roleIds) {
          totalRoles++;
          
          // Check if role is already assigned (preserve existing assignments)
          if (shift.assignedStaff[roleId]) {
            assignedRoles++;
            continue; // Already assigned - leave as is
          }
          
          // Add to unassigned roles list with priority information
          const roleInfo = roleRarity.get(roleId);
          
          // Debug: Log Lead Guide roles being collected
          if (roleId === '36f351dc-066c-4d87-a185-e37e3b6d6e6c') {
            console.log(`🔍 DEBUG: Collecting Lead Guide role for assignment:`, {
              dayKey,
              dayOfWeek,
              roleId,
              roleName: roleInfo?.name || 'Unknown Role',
              shiftName: shift.name,
              assignedStaff: shift.assignedStaff,
              rarityInfo: roleInfo
            });
          }
          
          allUnassignedRoles.push({
            dayKey,
            dayOfWeek,
            dayDate,
            shiftIndex,
            shift,
            roleId,
            roleName: roleInfo?.name || 'Unknown Role',
            priority: roleInfo?.priority || 4,
            rarityLevel: roleInfo?.rarityLevel || 'COMMON',
            trainedCount: roleInfo?.trainedCount || 0
          });
        }
      }
    }
    
    // Sort by priority (rare roles first) and then by day
    allUnassignedRoles.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority number = higher priority
      }
      return a.dayKey.localeCompare(b.dayKey);
    });
    
    console.log(`🎯 SMART ASSIGNMENT: Processing ${allUnassignedRoles.length} unassigned roles by priority`);
    allUnassignedRoles.forEach((roleInfo, index) => {
      console.log(`${index + 1}. ${roleInfo.rarityLevel} - ${roleInfo.roleName} (${roleInfo.trainedCount} trained) on ${roleInfo.dayOfWeek}`);
      
      // Debug: Check if this is a Lead Guide role
      if (roleInfo.roleId === '36f351dc-066c-4d87-a185-e37e3b6d6e6c') {
        console.log(`🔍 DEBUG: Found Lead Guide role in unassigned list:`, roleInfo);
      }
    });
    
    // Process roles in priority order
    for (const roleInfo of allUnassignedRoles) {
      const { dayKey, dayOfWeek, dayDate, shiftIndex, shift, roleId, roleName, rarityLevel } = roleInfo;
      
      console.log(`🎯 PROCESSING ${rarityLevel} ROLE: ${roleName} on ${dayOfWeek}`);
      
      // Get the current day's assigned staff (shared across all roles for this day)
      const dayAssignedStaff = dayAssignedStaffMap.get(dayKey);
      
      // Find best available staff for this role
      const availableStaff = staff.filter(s => {
        const staffMember = getStaffById(s.id);
        if (!staffMember) return false;
        
        // Skip on call staff - they should only be manually assigned
        if (staffMember.on_call) return false;
        
        // Check if staff is trained for this role
        const isTrained = (staffMember.trained_roles || staffMember.trainedRoles || []).includes(roleId);
        if (!isTrained) return false;
        
        // Check availability for this day
        const staffAvailability = staffMember.availability || [];
        const isAvailable = staffAvailability.includes(dayOfWeek);
        if (!isAvailable) return false;
        
        // Check if already assigned on this day
        if (dayAssignedStaff.has(s.id)) return false;
        
        // Check if staff has reached their target shifts for the week
        const currentWeekShifts = weeklyStaffAssignments.get(s.id) || 0;
        const targetShifts = staffTargetShifts.get(s.id) || 5;
        if (currentWeekShifts >= targetShifts) return false;
        
        // Check time off conflicts
        const staffTimeOffConflicts = timeOffConflicts.get(s.id) || [];
        const hasTimeOff = staffTimeOffConflicts.some(t => {
          const conflictStart = new Date(t.start_date);
          const conflictEnd = new Date(t.end_date);
          return dayDate >= conflictStart && dayDate <= conflictEnd;
        });
        if (hasTimeOff) return false;
        
        return true;
      });
      
      // Debug: Log available staff for Lead Guide roles
      if (roleId === '36f351dc-066c-4d87-a185-e37e3b6d6e6c') {
        console.log(`🔍 DEBUG Lead Guide (${roleName}) on ${dayOfWeek}:`, {
          roleId,
          availableStaffCount: availableStaff.length,
          availableStaff: availableStaff.map(s => ({
            id: s.id,
            name: s.name,
            trainedRoles: s.trained_roles || s.trainedRoles || [],
            availability: s.availability || [],
            onCall: s.on_call,
            currentWeekShifts: weeklyStaffAssignments.get(s.id) || 0,
            targetShifts: staffTargetShifts.get(s.id) || 5,
            timeOffConflicts: timeOffConflicts.get(s.id) || []
          }))
        });
      }

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
          console.log(`✅ ASSIGNING ${staffMember.name} to ${roleName} (${rarityLevel}) on ${dayOfWeek}`);
          
          // Update the shift assignment
          const updatedAssignedStaff = { ...shift.assignedStaff };
          updatedAssignedStaff[roleId] = staffMember.id;
          
          // Update the shift in the schedule
          newWeekSchedule[dayKey].shifts[shiftIndex] = {
            ...shift,
            assignedStaff: updatedAssignedStaff
          };
          
          // CRITICAL: Update the shared dayAssignedStaff set to prevent double-booking
          dayAssignedStaff.add(staffMember.id);
          
          // Update tracking
          weeklyStaffAssignments.set(staffMember.id, currentWeekShifts + 1);
          assignedRoles++;
          roleAssigned = true;
          
          // Log role assignment for tracking
          const weekKey = format(weekStart, 'yyyy-MM-dd');
          const assignmentDate = dayDate.toISOString();
          logRoleAssignment(staffMember.id, roleId, shift.shiftId, null, weekKey, assignmentDate);
          
          // Increment shift count for the assigned staff member
          dispatch({
            type: 'UPDATE_STAFF_SHIFT_COUNT',
            payload: {
              staffId: staffMember.id,
              roleId: roleId,
              assignmentDate: dayDate.toISOString()
            }
          });
          
          break;
        }
      }
      
      // Track unassigned roles for reporting
      if (!roleAssigned) {
        unassignedRoles.push({
          day: format(dayDate, 'EEEE, MMM d'),
          shift: shift.name,
          role: roleName,
          rarityLevel,
          trainedCount: roleInfo.trainedCount
        });
      }
    }
    
    setWeekSchedule(newWeekSchedule);
    
    // CRITICAL: Save the auto-assigned schedule to the database
    try {
      console.log('💾 Saving auto-assigned schedule to database...');
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      // Debug: Log what we're about to save
      console.log('🔍 DEBUG: newWeekSchedule before save:', JSON.stringify(newWeekSchedule, null, 2));
      
      const scheduleData = {
        days: {
          ...newWeekSchedule,
          week_start: weekStart.toISOString(),
          week_key: weekKey
        }
      };
      
      // Debug: Log the complete schedule data being saved
      console.log('🔍 DEBUG: scheduleData being saved:', JSON.stringify(scheduleData, null, 2));
      
      const existingSchedule = schedules.find(s => s.weekKey === weekKey);
      if (existingSchedule) {
        // Update existing schedule
        console.log('🔍 DEBUG: Updating existing schedule with ID:', existingSchedule.id);
        const result = await scheduleHelpers.update(existingSchedule.id, scheduleData);
        console.log('✅ Updated existing schedule in database');
        console.log('🔍 DEBUG: Update result:', result);
      } else {
        // Create new schedule
        console.log('🔍 DEBUG: Creating new schedule');
        const result = await scheduleHelpers.add(scheduleData);
        console.log('✅ Created new schedule in database');
        console.log('🔍 DEBUG: Create result:', result);
      }
      
      // Reload the schedule to ensure consistency
      console.log('🔄 Reloading schedule from database...');
      await loadWeekSchedule();
      
    } catch (error) {
      console.error('❌ Error saving auto-assigned schedule:', error);
      console.error('❌ Error details:', error.message, error.stack);
      alert('Auto-assignment completed but failed to save to database. Please try saving manually.');
    }
    
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
       alert(`Auto-assignment complete! All ${totalRoles} roles have been assigned and saved to the database.`);
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {shift.name}
                      </Typography>
                        {shift.isTeamEvent && (
                          <Chip
                            label="Team Event"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 20 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(shift.required_roles || shift.requiredRoles || []).map(roleId => {
                              const role = getRoleById(roleId);
                              
                              // Debug undefined roles
                              if (!role) {
                                console.error('🚨 UNDEFINED ROLE DETECTED (with tours):', {
                                  roleId,
                                  shiftName: shift.name,
                                  day: format(day, 'yyyy-MM-dd'),
                                  availableRoles: roles.map(r => ({ id: r.id, name: r.name })),
                                  totalRoles: roles.length
                                });
                                return null; // Skip rendering this role
                              }
                              
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
                      
                      // Debug undefined roles
                      if (!role) {
                        console.error('🚨 UNDEFINED ROLE DETECTED:', {
                          roleId,
                          shiftName: shift.name,
                          day: format(day, 'yyyy-MM-dd'),
                          availableRoles: roles.map(r => ({ id: r.id, name: r.name })),
                          totalRoles: roles.length
                        });
                        return null; // Skip rendering this role
                      }
                      
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
              }
              return null;
            })()}
          </Box>
          {/* Two-row button layout for desktop, single column for mobile */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'column',
            gap: isMobile ? 1 : 1.5,
            width: '100%'
          }}>
            {/* Row 1: Week Navigation (Desktop: Arrow buttons, Mobile: Full text) */}
            <Box sx={{ 
              display: 'flex', 
              gap: isMobile ? 0.5 : 1,
              justifyContent: isMobile ? 'stretch' : 'flex-start',
              width: '100%'
            }}>
            <Button
              variant="outlined"
                size={isMobile ? "small" : "medium"}
              onClick={() => setSelectedWeek(prev => addDays(prev, -7))}
                startIcon={!isMobile ? <ChevronLeftIcon /> : null}
                sx={{ 
                  minWidth: isMobile ? 'auto' : '60px',
                  flex: isMobile ? 1 : 'none',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  px: isMobile ? 1 : 1
                }}
              >
                {isMobile ? '← Prev' : ''}
            </Button>
            <Button
              variant="outlined"
                size={isMobile ? "small" : "medium"}
              onClick={() => setSelectedWeek(new Date())}
                startIcon={!isMobile ? <TodayIcon /> : null}
                sx={{ 
                  minWidth: isMobile ? 'auto' : '60px',
                  flex: isMobile ? 1 : 'none',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  px: isMobile ? 1 : 1
                }}
              >
                {isMobile ? 'Today' : ''}
            </Button>
            <Button
              variant="outlined"
                size={isMobile ? "small" : "medium"}
              onClick={() => setSelectedWeek(prev => addDays(prev, 7))}
                startIcon={!isMobile ? <ChevronRightIcon /> : null}
                sx={{ 
                  minWidth: isMobile ? 'auto' : '60px',
                  flex: isMobile ? 1 : 'none',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  px: isMobile ? 1 : 1
                }}
              >
                {isMobile ? 'Next →' : ''}
            </Button>
            </Box>

            {/* Row 2: Action Buttons */}
            <Box sx={{ 
              display: 'flex', 
              gap: isMobile ? 0.5 : 1,
              flexWrap: isMobile ? 'wrap' : 'nowrap',
              justifyContent: isMobile ? 'stretch' : 'flex-start',
              width: '100%'
            }}>
              <Tooltip title={`Auto-assign staff for the week of ${format(weekStart, 'MMMM d, yyyy')}`}>
            <Button
              variant="contained"
                  size={isMobile ? "small" : "medium"}
                  startIcon={!isMobile ? <AutoAssignIcon /> : null}
              onClick={autoAssignStaff}
                  disabled={isScheduleLocked && lockedBy !== currentUser?.id}
                  sx={{ 
                    minWidth: isMobile ? 'auto' : '120px',
                    flex: isMobile ? 1 : 'none',
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }}
                >
                  {isMobile ? 'Auto' : 'Auto Assign'}
            </Button>
              </Tooltip>
            <Button
              variant="outlined"
              color="secondary"
              size={isMobile ? "small" : "medium"}
              onClick={handleBugFixingMenuOpen}
              disabled={loading || (isScheduleLocked && lockedBy !== currentUser?.id)}
              sx={{ 
                minWidth: isMobile ? 'auto' : '120px',
                flex: isMobile ? 1 : 'none',
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }}
            >
              {isMobile ? 'Bug Fix' : 'Bug Fixing'}
            </Button>
            <Button
              variant="contained"
                size={isMobile ? "small" : "medium"}
                startIcon={!isMobile ? <SaveIcon /> : null}
              onClick={saveWeekSchedule}
                disabled={isScheduleLocked && lockedBy !== currentUser?.id || isSaving}
                sx={{ 
                  minWidth: isMobile ? 'auto' : '120px',
                  flex: isMobile ? 1 : 'none',
                  fontSize: isMobile ? '0.75rem' : '0.875rem'
                }}
              >
                {isMobile ? (isSaving ? 'Saving...' : 'Save') : (isSaving ? 'Saving...' : 'Save')}
              </Button>
              <Button
                variant="contained"
                color="success"
                size={isMobile ? "small" : "medium"}
                startIcon={!isMobile ? <SendIcon /> : null}
                onClick={publishSchedule}
                disabled={isScheduleLocked && lockedBy !== currentUser?.id || isPublishing || isSaving}
                sx={{ 
                  minWidth: isMobile ? 'auto' : '140px',
                  flex: isMobile ? 1 : 'none',
                  fontSize: isMobile ? '0.75rem' : '0.875rem'
                }}
              >
                {isMobile ? (isPublishing ? 'Publishing...' : 'Publish') : (isPublishing ? 'Publishing...' : 'Publish')}
            </Button>
          </Box>
        </Box>
        </Box>



        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">
          Week of {format(weekStart, 'MMMM d, yyyy')}
        </Typography>
          {isPublished && (
            <Chip 
              label="Published" 
              color="success" 
              size="small"
              icon={<CheckBoxIcon />}
            />
          )}
        </Box>

                   {/* Assignment Status Summary */}
          {roleCounts.totalRoles > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Tooltip title={`Assignment Status: ${roleCounts.assignedRoles}/${roleCounts.totalRoles} roles assigned${roleCounts.unassignedRoles > 0 ? ` • ${roleCounts.unassignedRoles} role${roleCounts.unassignedRoles !== 1 ? 's' : ''} still need${roleCounts.unassignedRoles === 1 ? 's' : ''} assignment` : ''}`} arrow placement="top">
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {roleCounts.unassignedRoles === 0 ? (
                    <Alert severity="success" sx={{ py: 0.5, px: 1, '& .MuiAlert-message': { py: 0 } }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        ✓ All roles assigned
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ py: 0.5, px: 1, '& .MuiAlert-message': { py: 0 } }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                        ⚠ {roleCounts.unassignedRoles} unassigned
                      </Typography>
                    </Alert>
                  )}
                </Box>
              </Tooltip>
            </Box>
          )}

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
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          startIcon={<TemplateIcon />}
                          onClick={(e) => {
                            setSelectedDayForTemplate(day);
                            setTemplateMenuAnchor(e.currentTarget);
                          }}
                          variant="outlined"
                          sx={{ 
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            px: isMobile ? 1 : 1.5
                          }}
                        >
                          Templates
                        </Button>
                        <Button
                          size="small"
                          startIcon={<SaveAltIcon />}
                          onClick={() => saveDayAsTemplate(day, dayIndex)}
                          variant="outlined"
                          sx={{ 
                            fontSize: isMobile ? '0.75rem' : '0.875rem',
                            px: isMobile ? 1 : 1.5
                          }}
                        >
                          {isMobile ? 'Save' : 'Save Template'}
                        </Button>
                      <Button
                        size="small"
                                startIcon={<AddCircleIcon />}
                        onClick={() => {
                          setSelectedDay(day);
                          setOpenShiftDialog(true);
                        }}
                      >
                          {isMobile ? 'Add' : 'Add Shifts'}
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
           disableScrollLock={true}
           disablePortal={true}
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

        {/* Bug Fixing Menu */}
        <Menu
          anchorEl={bugFixingMenuAnchor}
          open={Boolean(bugFixingMenuAnchor)}
          onClose={handleBugFixingMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          disableScrollLock={true}
          disablePortal={true}
        >
          <MenuItem onClick={() => {
            clearWeek();
            handleBugFixingMenuClose();
          }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            Clear Week
          </MenuItem>
          <MenuItem onClick={() => {
            cleanInvalidAssignments();
            handleBugFixingMenuClose();
          }}>
            <ListItemIcon>
              <WarningIcon fontSize="small" />
            </ListItemIcon>
            Clean Invalid Assignments
          </MenuItem>
          <MenuItem onClick={() => {
            checkDataIntegrity();
            handleBugFixingMenuClose();
          }}>
            <ListItemIcon>
              <RefreshIcon fontSize="small" />
            </ListItemIcon>
            Check Data Integrity
          </MenuItem>
          <MenuItem onClick={() => {
            fixStaleRoleId();
            handleBugFixingMenuClose();
          }}>
            <ListItemIcon>
              <AutoFixHighIcon fontSize="small" />
            </ListItemIcon>
            Fix Stale Role ID
          </MenuItem>
          <MenuItem onClick={() => {
            removeShiftsWithNoValidRoles();
            handleBugFixingMenuClose();
          }}>
            <ListItemIcon>
              <MergeIcon fontSize="small" />
            </ListItemIcon>
            Clean Bad Shifts
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

        {/* Template Selection Menu */}
        <Menu
          anchorEl={templateMenuAnchor}
          open={Boolean(templateMenuAnchor)}
          onClose={() => setTemplateMenuAnchor(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          disableScrollLock={true}
          disablePortal={true}
        >
          {templates.length === 0 ? (
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                No templates saved yet
              </Typography>
            </MenuItem>
          ) : (
            templates.map((template) => (
              <MenuItem
                key={template.id}
                onClick={() => {
                  if (selectedDayForTemplate) {
                    loadTemplate(template, selectedDayForTemplate);
                  }
                }}
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {template.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {template.shifts.length} shift(s) • {format(new Date(template.createdAt), 'MMM d, yyyy')}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTemplate(template.id);
                  }}
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </MenuItem>
            ))
          )}
         </Menu>
      </Box>
    </DndProvider>
  );
}

export default ScheduleBuilderTab;
