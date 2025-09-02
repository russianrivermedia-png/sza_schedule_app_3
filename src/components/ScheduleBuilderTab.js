import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { scheduleHelpers } from '../lib/supabaseHelpers';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import DroppableRole from './DroppableRole';
import TourDisplay from './TourDisplay';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    getTimeOffByStaffId
  } = useData();
  
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

  // Shift assignment state
  const [selectedShifts, setSelectedShifts] = useState([]);

  // Actions menu state
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState(null);

  // Add Role dialog state
  const [openAddRoleDialog, setOpenAddRoleDialog] = useState(false);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState('');

  // Performance optimization: Conflict cache
  const [conflictCache, setConflictCache] = useState(new Map());

  // Get week dates
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekDates = DAYS_OF_WEEK.map((_, index) => addDays(weekStart, index));

  useEffect(() => {
    loadWeekSchedule();
  }, [selectedWeek, schedules, isSaving]);

  // Debug: Log when schedules change
  useEffect(() => {
    console.log('Schedules changed:', schedules);
  }, [schedules]);

  const loadWeekSchedule = () => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    console.log('=== LOAD WEEK SCHEDULE ===');
    console.log('Loading week schedule for:', weekKey);
    console.log('Available schedules:', schedules);
    console.log('Schedule weekKeys:', schedules.map(s => ({ id: s.id, weekKey: s.weekKey, week_start: s.week_start })));
    console.log('Full schedule objects:', schedules);
    const existingSchedule = schedules.find(s => s.weekKey === weekKey);
    console.log('Found schedule:', existingSchedule);
    console.log('Looking for weekKey:', weekKey);
    console.log('Available weekKeys:', schedules.map(s => s.weekKey));
    console.log('Is saving:', isSaving);
    console.log('Current weekSchedule state:', weekSchedule);
    
    if (existingSchedule) {
      console.log('Setting week schedule to:', existingSchedule.days);
      // Extract the actual schedule data, excluding the metadata
      const { week_start, week_key, ...scheduleData } = existingSchedule.days || {};
      console.log('Extracted schedule data:', scheduleData);
      setWeekSchedule(scheduleData);
    } else {
      // Only clear the schedule if we're not currently saving
      if (!isSaving) {
        console.log('No schedule found, setting empty');
        setWeekSchedule({});
      } else {
        console.log('No schedule found but currently saving, keeping current schedule');
        console.log('Current weekSchedule will remain:', weekSchedule);
      }
    }
    console.log('=== END LOAD WEEK SCHEDULE ===');
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
    console.log('=== SAVE START ===');
    console.log('Current weekSchedule before save:', weekSchedule);
    console.log('Saving schedule data:', scheduleData);

    setIsSaving(true);
    console.log('Set isSaving to true');
    try {
      const existingSchedule = schedules.find(s => s.weekKey === weekKey);
      console.log('Existing schedule found:', existingSchedule);
      if (existingSchedule) {
        // Update existing schedule
        console.log('Updating existing schedule...');
        const updatedSchedule = await scheduleHelpers.update(existingSchedule.id, scheduleData);
        console.log('Updated schedule:', updatedSchedule);
        // Don't dispatch manually - let real-time subscription handle it
        // dispatch({ type: 'UPDATE_SCHEDULE', payload: updatedSchedule });
      } else {
        // Create new schedule
        console.log('Creating new schedule...');
        const newSchedule = await scheduleHelpers.add(scheduleData);
        console.log('New schedule created:', newSchedule);
        // Don't dispatch manually - let real-time subscription handle it
        // dispatch({ type: 'ADD_SCHEDULE', payload: newSchedule });
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert(`Error saving schedule: ${error.message}. Please try again.`);
    } finally {
      console.log('Set isSaving to false');
      setIsSaving(false);
      console.log('=== SAVE END ===');
    }
  };

  // Performance optimization: Clear conflict cache when relevant data changes
  useEffect(() => {
    setConflictCache(new Map());
  }, [timeOffRequests, weekSchedule]);

  // Performance optimization: Cached conflict checking
  const getStaffConflicts = (staffId, day, roleId) => {
    // Create cache key
    const cacheKey = `${staffId}-${format(day, 'yyyy-MM-dd')}-${roleId}`;
    
    // Check cache first
    if (conflictCache.has(cacheKey)) {
      return conflictCache.get(cacheKey);
    }

    const conflicts = [];
    const staffMember = getStaffById(staffId); // Use optimized lookup
    if (!staffMember) {
      // Cache empty result
      setConflictCache(prev => new Map(prev).set(cacheKey, conflicts));
      return conflicts;
    }

    // Check availability
    const dayOfWeek = DAYS_OF_WEEK[day.getDay() === 0 ? 6 : day.getDay() - 1];
    if (!(staffMember.availability || []).includes(dayOfWeek)) {
      conflicts.push('Not available on this day');
    }

    // Check time off requests - use optimized lookup
    const staffTimeOff = getTimeOffByStaffId(staffId);
    const hasTimeOff = staffTimeOff.some(t => 
      t.status === 'approved' &&
      (isSameDay(new Date(t.startDate), day) || 
       isSameDay(new Date(t.endDate), day) ||
       (new Date(t.startDate) <= day && new Date(t.endDate) >= day))
    );
    
    if (hasTimeOff) {
      conflicts.push('Has approved time off request');
    }

    // Check for double-booking on the same day
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey];
    if (daySchedule && daySchedule.shifts) {
      // Check if staff is assigned to a DIFFERENT shift on this day
      const isAssignedToDifferentShift = daySchedule.shifts.some(shift => 
        Object.values(shift.assignedStaff).includes(staffId)
      );
      
      // Only show conflict if they're assigned to a different shift (not the current one)
      if (isAssignedToDifferentShift) {
        // Check if this is the same shift/role (which is allowed)
        const currentShift = daySchedule.shifts.find(s => 
          Object.values(s.assignedStaff).includes(staffId)
        );
        const isSameRole = currentShift && currentShift.assignedStaff[roleId] === staffId;
        
        if (!isSameRole) {
          conflicts.push('Already assigned to another shift on this day');
        }
      }
    }

    // Check role training
    if (!(staffMember.trained_roles || staffMember.trainedRoles || []).includes(roleId)) {
      conflicts.push('Not trained for this role');
    }

    // Check weekly shift limit
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const currentWeekShifts = Object.values(weekSchedule).flatMap(day => 
      day.shifts?.flatMap(shift => 
        Object.values(shift.assignedStaff).filter(id => id === staffId)
      ) || []
    ).length;
    
    if (currentWeekShifts >= (staffMember.targetShifts || 5)) {
      conflicts.push(`Exceeds target shifts (${staffMember.targetShifts || 5})`);
    }

    // Cache the result
    setConflictCache(prev => new Map(prev).set(cacheKey, conflicts));
    return conflicts;
  };

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

  const handleStaffDrop = (day, shiftIndex, roleId, staffId) => {
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
      
      if (currentShiftIndex !== -1) {
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
      if (existingStaffId === staffId) return; // Same staff, no change
      
      // Remove existing staff from this role (they go back to staff panel)
      delete updatedAssignedStaff[roleId];
    }
    
    // Assign new staff to the role
    updatedAssignedStaff[roleId] = staffId;
    
    // Increment shift count for the assigned staff member
    if (staffId && (!existingStaffId || existingStaffId !== staffId)) {
      dispatch({
        type: 'UPDATE_STAFF_SHIFT_COUNT',
        payload: {
          staffId: staffId,
          roleId: roleId
        }
      });
    }
    
         // Check for training conflicts and show warning if needed - use optimized lookups
     const staffMember = getStaffById(staffId);
     const role = getRoleById(roleId);
    
    if (staffMember && role && !(staffMember.trained_roles || staffMember.trainedRoles || []).includes(roleId)) {
      alert(`Warning: ${staffMember.name} is not trained for ${role.name}. Assignment allowed but may cause issues.`);
    }
    
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

  const autoAssignStaff = () => {
    const newWeekSchedule = { ...weekSchedule };
    let totalRoles = 0;
    let assignedRoles = 0;
    let unassignedRoles = [];
    
    Object.keys(newWeekSchedule).forEach(dayKey => {
      const day = newWeekSchedule[dayKey];
      if (!day.shifts) return;
      
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
      
      day.shifts.forEach((shift, shiftIndex) => {
        const updatedAssignedStaff = { ...shift.assignedStaff };
        
        (shift.required_roles || shift.requiredRoles || []).forEach(roleId => {
          totalRoles++;
          
          // Check if role is already assigned (preserve existing assignments)
          if (updatedAssignedStaff[roleId]) {
            assignedRoles++;
            return; // Already assigned - leave as is
          }
          
          // Find best available staff for this role - use optimized lookups
          const availableStaff = staff
            .filter(s => {
              const staffMember = getStaffById(s.id);
              if (!staffMember) return false;
              
              return (staffMember.trained_roles || staffMember.trainedRoles || []).includes(roleId) &&
                     (staffMember.availability || []).includes(DAYS_OF_WEEK[new Date(dayKey).getDay() === 0 ? 6 : new Date(dayKey).getDay() - 1]) &&
                     !dayAssignedStaff.has(s.id); // Not already assigned on this day
            })
            .sort((a, b) => {
              // Sort by current week shifts (ascending) and then by target shifts
              const aCurrentShifts = Object.values(newWeekSchedule).flatMap(d => 
                d.shifts?.flatMap(sh => 
                  Object.values(sh.assignedStaff).filter(id => id === a.id)
                ) || []
              ).length;
              const bCurrentShifts = Object.values(newWeekSchedule).flatMap(d => 
                d.shifts?.flatMap(sh => 
                  Object.values(sh.assignedStaff).filter(id => id === b.id)
                ) || []
              ).length;
              
              if (aCurrentShifts !== bCurrentShifts) {
                return aCurrentShifts - bCurrentShifts;
              }
              return (a.targetShifts || 5) - (b.targetShifts || 5);
            });
          
                     // Try to assign staff to this role - ONLY if there are NO conflicts
           let roleAssigned = false;
          for (const staffMember of availableStaff) {
            const conflicts = getStaffConflicts(staffMember.id, new Date(dayKey), roleId);
             // Only assign if there are absolutely NO conflicts
            if (conflicts.length === 0) {
              updatedAssignedStaff[roleId] = staffMember.id;
               dayAssignedStaff.add(staffMember.id); // Mark as assigned for this day
               assignedRoles++;
               roleAssigned = true;
               
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
             // If there are any conflicts, skip this staff member and try the next one
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
        });
        
        day.shifts[shiftIndex] = {
          ...shift,
          assignedStaff: updatedAssignedStaff
        };
      });
    });
    
    setWeekSchedule(newWeekSchedule);
    
         // Show results to user
     const unassignedCount = totalRoles - assignedRoles;
     if (unassignedCount > 0) {
       const message = `Auto-assignment complete! ${assignedRoles}/${totalRoles} roles assigned. ${unassignedCount} roles could not be assigned due to conflicts or insufficient available staff.\n\nConflicts include: training requirements, availability, time off requests, double-booking, and weekly shift limits.\n\nUnassigned roles have been logged to the console for review.`;
       alert(message);
       console.log('Unassigned roles (due to conflicts):', unassignedRoles);
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
                        onChange={(e) => handleArrivalTimeChange(day, shiftIndex, e.target.value)}
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
                                onStaffDrop={(staffId) => handleStaffDrop(day, shiftIndex, roleId, staffId)}
                                onRemoveStaff={() => removeStaffFromRole(day, shiftIndex, roleId)}
                                    onStaffColorChange={(staffId, color) => handleStaffColorChange(day, shiftIndex, staffId, color)}
                                    staffColor={shift.staffColors?.[assignedStaffId] || 'gray'}
                                    staff={staff}
                                    roles={roles}
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
                        onTourColorChange={(tourId, color) => handleTourColorChange(day, shiftIndex, tourId, color)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {hasNotes && (
                        <Tooltip title={shift.notes} arrow>
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleOpenNotesDialog(day, shiftIndex, shift)}
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
                              setSelectedShiftIndex(shiftIndex);
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
                            onStaffColorChange={(staffId, color) => handleStaffColorChange(day, actualShiftIndex, staffId, color)}
                            staffColor={shift.staffColors?.[assignedStaffId] || 'gray'}
                            staff={staff}
                            roles={roles}
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
          <Typography variant="h4">Schedule Builder</Typography>
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
            <Button
              variant="contained"
              startIcon={<AutoAssignIcon />}
              onClick={autoAssignStaff}
            >
              Auto Assign
            </Button>
            <Button
              variant="contained"
              onClick={saveWeekSchedule}
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
      </Box>
    </DndProvider>
  );
}

export default ScheduleBuilderTab;
