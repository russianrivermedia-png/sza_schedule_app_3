import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Tooltip,
  Collapse,
  Avatar,
  Badge,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Chip as MuiChip,
  OutlinedInput,
  Box as MuiBox,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  AddCircle as AddCircleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notes as NotesIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  AutoFixHigh as AutoAssignIcon,
  CheckCircle as CheckCircleIcon,
  LibraryBooks as TemplateIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format, startOfWeek, addDays } from 'date-fns';
import { useData } from '../context/DataContext';
import { useLocalSchedule } from '../hooks/useLocalSchedule';
import { useSchedulePersistence } from '../hooks/useSchedulePersistence';
import { shiftHelpers } from '../lib/supabaseHelpers';
import DraggableStaff from './DraggableStaff';
import DroppableRoleTest from './DroppableRoleTest';
import TourDisplay from './TourDisplay';
import { getTourColorValue } from '../config/tourColors';
import { getStaffColorValue, getAllStaffColors } from '../config/staffColors';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ScheduleBuilderV2() {
  const { 
    schedules, 
    dispatch, 
    loading, 
    shifts, 
    staff, 
    roles, 
    tours,
    timeOffRequests,
    getStaffById,
    getRoleById,
    getTimeOffByStaffId
  } = useData();

  console.log('🔍 ScheduleBuilderV2 render - loading:', loading);
  console.log('🔍 ScheduleBuilderV2 render - staff:', staff?.length);
  console.log('🔍 ScheduleBuilderV2 render - shifts:', shifts?.length);
  console.log('🔍 ScheduleBuilderV2 render - roles:', roles?.length);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  
  // Dialog states
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [openCustomShiftDialog, setOpenCustomShiftDialog] = useState(false);
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [openStaffSelectionDialog, setOpenStaffSelectionDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedShiftIndex, setSelectedShiftIndex] = useState(null);
  const [selectedShiftData, setSelectedShiftData] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [notes, setNotes] = useState('');
  const [expandedNotes, setExpandedNotes] = useState({});
  
  // Staff selection dialog state
  const [staffFilterByRole, setStaffFilterByRole] = useState('');
  const [staffFilterByDays, setStaffFilterByDays] = useState([]);
  const [staffSortBy, setStaffSortBy] = useState('name');
  const [staffSortDirection, setStaffSortDirection] = useState('asc');
  const [staffFilterOnCall, setStaffFilterOnCall] = useState(false);
  
  // Shift selection state
  const [selectedShifts, setSelectedShifts] = useState([]);
  
  // Auto-assignment state
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [assignmentResults, setAssignmentResults] = useState(null);
  
  // Shift creation state
  const [shiftName, setShiftName] = useState('');
  const [shiftDescription, setShiftDescription] = useState('');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [defaultStartingTime, setDefaultStartingTime] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedTours, setSelectedTours] = useState([]);
  const [isTeamEvent, setIsTeamEvent] = useState(false);
  
  // Day template state
  const [openTemplateDialog, setOpenTemplateDialog] = useState(false);
  const [openLoadTemplateDialog, setOpenLoadTemplateDialog] = useState(false);
  const [dayTemplates, setDayTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Day actions menu state
  const [dayActionsMenuAnchor, setDayActionsMenuAnchor] = useState(null);
  const [selectedDayForActions, setSelectedDayForActions] = useState(null);
  
  // Test the new hooks
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
  
  const { saveSchedule } = useSchedulePersistence(dispatch);

  // Debug: Log shift templates to see their tours
  useEffect(() => {
    if (shifts && shifts.length > 0) {
      console.log('🔍 All shift templates:', shifts.map(s => ({
        id: s.id,
        name: s.name,
        tours: s.tours,
        toursLength: s.tours?.length || 0
      })));
    }
  }, [shifts]);
  
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 });
  const weekDates = DAYS_OF_WEEK.map((_, index) => addDays(weekStart, index));

  const handleTestUpdate = () => {
    // Test updating local schedule - add shifts to first 3 days
    const day1Key = format(weekDates[0], 'yyyy-MM-dd');
    const day2Key = format(weekDates[1], 'yyyy-MM-dd');
    const day3Key = format(weekDates[2], 'yyyy-MM-dd');
    
    updateLocalSchedule(prev => ({
      ...prev,
      [day1Key]: {
        ...prev[day1Key],
        shifts: [
          ...(prev[day1Key]?.shifts || []),
          {
            id: 'test-shift-day1-' + Date.now(),
            name: `${DAYS_OF_WEEK[0]} Test Shift`,
            assignedStaff: { 'test-role': 'test-staff' }
          }
        ]
      },
      [day2Key]: {
        ...prev[day2Key],
        shifts: [
          ...(prev[day2Key]?.shifts || []),
          {
            id: 'test-shift-day2-' + Date.now(),
            name: `${DAYS_OF_WEEK[1]} Test Shift`,
            assignedStaff: { 'test-role': 'test-staff' }
          }
        ]
      },
      [day3Key]: {
        ...prev[day3Key],
        shifts: [
          ...(prev[day3Key]?.shifts || []),
          {
            id: 'test-shift-day3-' + Date.now(),
            name: `${DAYS_OF_WEEK[2]} Test Shift`,
            assignedStaff: { 'test-role': 'test-staff' }
          }
        ]
      }
    }));
  };

  const handleTestSave = async () => {
    try {
      await saveSchedule(localSchedule, weekKey, weekStart);
      markAsSaved();
      console.log('✅ Test save successful');
    } catch (error) {
      console.error('❌ Test save failed:', error);
    }
  };

  const handleTestClear = () => {
    clearLocalAssignments();
  };

  const handleClearShifts = () => {
    // Clear all shifts from the week
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
  };

  const handleClearDay = (dayKey) => {
    // Clear all shifts from a specific day
    updateLocalSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        shifts: []
      }
    }));
  };

  const handleTestReset = () => {
    resetToDatabase();
  };

  // Shift management functions
  const handleShiftSelection = (shiftId) => {
    setSelectedShifts(prev => 
      prev.includes(shiftId) 
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId]
    );
  };

  const handleAddShiftsToDay = () => {
    if (!selectedDay || selectedShifts.length === 0) return;

    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    const selectedShiftTemplates = shifts.filter(s => selectedShifts.includes(s.id));

    updateLocalSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        shifts: [
          ...(prev[dayKey]?.shifts || []),
          ...selectedShiftTemplates.map(shift => {
            // Initialize tour colors with default colors from tours
            const tourColors = {};
            if (shift.tours && shift.tours.length > 0) {
              const shiftTours = tours?.filter(tour => shift.tours.includes(tour.id)) || [];
              shiftTours.forEach(tour => {
                tourColors[tour.id] = tour.default_color || 'default';
              });
            }
            
            return {
              id: `${shift.id}-${Date.now()}`,
              name: shift.name,
              shiftId: shift.id,
              startTime: shift.startTime,
              endTime: shift.endTime,
              notes: '',
              required_roles: shift.required_roles || [],
              tours: shift.tours || [],
              tourColors,
              arrivalTime: shift.default_starting_time || '',
              assignedStaff: {}
            };
          })
        ]
      }
    }));

    setSelectedShifts([]);
    setOpenShiftDialog(false);
  };

  const handleAddCustomShift = async () => {
    if (!selectedDay || !shiftName.trim() || selectedRoles.length === 0) {
      alert('Please provide a shift name and select at least one required role.');
      return;
    }

    try {
      // First, create the shift template in the database
      const shiftData = {
        name: shiftName.trim(),
        description: shiftDescription.trim() || null,
        required_roles: selectedRoles,
        tours: selectedTours,
        default_starting_time: defaultStartingTime || null,
        is_team_event: isTeamEvent,
      };

      console.log('Creating shift template:', shiftData);
      const newShiftTemplate = await shiftHelpers.add(shiftData);
      
      // Add the shift template to the global shifts list
      dispatch({ type: 'ADD_SHIFT', payload: newShiftTemplate });

      // Now add the shift instance to the schedule
      const dayKey = format(selectedDay, 'yyyy-MM-dd');
      
      // For team events, assign all staff to different roles for dashboard purposes
      let assignedStaff = {};
      if (isTeamEvent && staff && staff.length > 0 && selectedRoles.length > 0) {
        // Assign each staff member to a role so everyone shows up on their dashboard
        staff.forEach((staffMember, index) => {
          const roleIndex = index % selectedRoles.length;
          const roleId = selectedRoles[roleIndex];
          assignedStaff[roleId] = staffMember.id;
        });
      }

      // Initialize tour colors with default colors from tours
      const tourColors = {};
      if (newShiftTemplate.tours && newShiftTemplate.tours.length > 0) {
        const shiftTours = tours?.filter(tour => newShiftTemplate.tours.includes(tour.id)) || [];
        shiftTours.forEach(tour => {
          tourColors[tour.id] = tour.default_color || 'default';
        });
      }

      const newShiftInstance = {
        id: `${newShiftTemplate.id}-${Date.now()}`,
        shiftId: newShiftTemplate.id,
        name: newShiftTemplate.name,
        description: newShiftTemplate.description,
        required_roles: newShiftTemplate.required_roles,
        tours: newShiftTemplate.tours || [],
        tourColors,
        assignedStaff,
        arrivalTime: newShiftTemplate.default_starting_time || '',
        notes: '',
        isTeamEvent: newShiftTemplate.is_team_event || false,
      };

      updateLocalSchedule(prev => ({
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          shifts: [...(prev[dayKey].shifts || []), newShiftInstance]
        }
      }));

      // Reset form
      setShiftName('');
      setShiftDescription('');
      setShiftStartTime('');
      setShiftEndTime('');
      setDefaultStartingTime('');
      setSelectedRoles([]);
      setSelectedTours([]);
      setIsTeamEvent(false);
      setOpenCustomShiftDialog(false);

      console.log('✅ Shift template created and added to schedule:', newShiftTemplate.name);

    } catch (error) {
      console.error('Error creating shift:', error);
      alert(`Error creating shift: ${error.message}. Please try again.`);
    }
  };

  const handleDeleteShift = (dayKey, shiftIndex) => {
    updateLocalSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        shifts: prev[dayKey].shifts.filter((_, index) => index !== shiftIndex)
      }
    }));
  };

  const handleOpenNotesDialog = (day, shiftIndex, shiftData) => {
    setSelectedDay(day);
    setSelectedShiftIndex(shiftIndex);
    setSelectedShiftData(shiftData);
    setNotes(shiftData.notes || '');
    setOpenNotesDialog(true);
  };

  const handleSaveNotes = () => {
    if (!selectedDay || selectedShiftIndex === null) return;

    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    updateLocalSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        shifts: prev[dayKey].shifts.map((shift, index) => 
          index === selectedShiftIndex 
            ? { ...shift, notes }
            : shift
        )
      }
    }));

    setOpenNotesDialog(false);
  };

  const toggleNotesExpansion = (dayKey, shiftIndex) => {
    const key = `${dayKey}-${shiftIndex}`;
    setExpandedNotes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Render schedule table similar to main builder
  const renderScheduleTable = (day, dayIndex) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = localSchedule[dayKey] || { shifts: [] };

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
        {/* Tour-based shifts (Guiding Shifts) in table format */}
        {shiftsWithTours.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'primary.main', fontWeight: 'bold' }}>
              Guiding Shifts
            </Typography>
            <TableContainer component={Paper}>
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
                  const hasNotes = shift.notes && shift.notes.trim().length > 0;

                  return (
                    <React.Fragment key={shift.id}>
                      <TableRow>
                        <TableCell>
                          <TextField
                            size="small"
                            value={shift.arrivalTime || ''}
                            onChange={(e) => {
                              updateLocalSchedule(prev => ({
                                ...prev,
                                [dayKey]: {
                                  ...prev[dayKey],
                                  shifts: prev[dayKey].shifts.map((s, index) => 
                                    index === actualShiftIndex 
                                      ? { ...s, arrivalTime: e.target.value }
                                      : s
                                  )
                                }
                              }));
                            }}
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
                              
                              if (!role) {
                                console.error('🚨 UNDEFINED ROLE DETECTED (with tours):', {
                                  roleId,
                                  shiftName: shift.name,
                                  day: format(day, 'yyyy-MM-dd'),
                                  availableRoles: roles.map(r => ({ id: r.id, name: r.name })),
                                  totalRoles: roles.length
                                });
                                return null;
                              }
                              
                              const assignedStaffId = shift.assignedStaff?.[roleId];
                              const assignedStaff = getStaffById(assignedStaffId);
                              const conflicts = assignedStaffId ? getStaffConflicts(assignedStaffId, day, roleId) : [];
                              
                              // For team events, show "All Staff" instead of individual assignments
                              if (shift.isTeamEvent) {
                                return (
                                  <Box key={roleId} sx={{ mb: 1 }}>
                                    <Chip
                                      label="All Staff"
                                      size="small"
                                      color="primary"
                                      variant="filled"
                                      sx={{ 
                                        fontSize: '0.7rem', 
                                        height: 24,
                                        fontWeight: 'bold'
                                      }}
                                    />
                                  </Box>
                                );
                              }
                              
                              return (
                                <Box key={roleId} sx={{ mb: 1 }}>
                                  <DroppableRoleTest
                                    role={role}
                                    assignedStaff={assignedStaff}
                                    conflicts={conflicts}
                                    onStaffDrop={(staffId, sourceInfo) => handleStaffDrop(day, actualShiftIndex, roleId, staffId, sourceInfo)}
                                    onRemoveStaff={() => removeStaffAssignment(dayKey, actualShiftIndex, roleId)}
                                    staff={staff || []}
                                    roles={roles || []}
                                    timeOffRequests={timeOffRequests || []}
                                    day={day}
                                    shiftIndex={actualShiftIndex}
                                    onStaffColorChange={(staffId, color) => handleStaffColorChange(day, actualShiftIndex, staffId, color)}
                                    staffColor={shift.staffColors?.[assignedStaffId] || 'default'}
                                    onOpenStaffSelection={handleOpenStaffSelection}
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
                            tours={getShiftTours(shift)}
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
                            onClick={() => handleOpenNotesDialog(day, actualShiftIndex, shift)}
                            sx={{ mr: 0.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteShift(dayKey, actualShiftIndex)}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Non-tour shifts in compact boxes */}
        {shiftsWithoutTours.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary', fontWeight: 'bold' }}>
              Other Shifts
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {shiftsWithoutTours.map((shift) => {
                // Find the actual index in the original daySchedule.shifts array
                const actualShiftIndex = daySchedule.shifts.findIndex(s => s.id === shift.id);
                const hasNotes = shift.notes && shift.notes.trim().length > 0;
                
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
                      onClick={() => handleOpenNotesDialog(day, actualShiftIndex, shift)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', top: 4, right: 32, color: 'error.main' }}
                      onClick={() => handleDeleteShift(dayKey, actualShiftIndex)}
                    >
                      <DeleteIcon />
                    </IconButton>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, pr: 6 }}>
                      <TextField
                        size="small"
                        value={shift.arrivalTime || ''}
                        onChange={(e) => {
                          updateLocalSchedule(prev => ({
                            ...prev,
                            [dayKey]: {
                              ...prev[dayKey],
                              shifts: prev[dayKey].shifts.map((s, index) => 
                                index === actualShiftIndex 
                                  ? { ...s, arrivalTime: e.target.value }
                                  : s
                              )
                            }
                          }));
                        }}
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
                        
                        if (!role) {
                          console.error('🚨 UNDEFINED ROLE DETECTED:', {
                            roleId,
                            shiftName: shift.name,
                            day: format(day, 'yyyy-MM-dd'),
                            availableRoles: roles.map(r => ({ id: r.id, name: r.name })),
                            totalRoles: roles.length
                          });
                          return null;
                        }
                        
                        const assignedStaffId = shift.assignedStaff?.[roleId];
                        const assignedStaff = getStaffById(assignedStaffId);
                        const conflicts = assignedStaffId ? getStaffConflicts(assignedStaffId, day, roleId) : [];
                        
                        // For team events, show "All Staff" instead of individual assignments
                        if (shift.isTeamEvent) {
                          return (
                            <Box key={roleId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                label="All Staff"
                                size="small"
                                color="primary"
                                variant="filled"
                                sx={{ 
                                  fontSize: '0.7rem', 
                                  height: 24,
                                  fontWeight: 'bold'
                                }}
                              />
                            </Box>
                          );
                        }
                        
                        return (
                          <Box key={roleId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <DroppableRoleTest
                              role={role}
                              assignedStaff={assignedStaff}
                              conflicts={conflicts}
                              onStaffDrop={(staffId, sourceInfo) => handleStaffDrop(day, actualShiftIndex, roleId, staffId, sourceInfo)}
                              onRemoveStaff={() => removeStaffAssignment(dayKey, actualShiftIndex, roleId)}
                              staff={staff || []}
                              roles={roles || []}
                              timeOffRequests={timeOffRequests || []}
                              day={day}
                              shiftIndex={actualShiftIndex}
                              onStaffColorChange={(staffId, color) => handleStaffColorChange(day, actualShiftIndex, staffId, color)}
                              staffColor={shift.staffColors?.[assignedStaffId] || 'default'}
                              onOpenStaffSelection={handleOpenStaffSelection}
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

                    {hasNotes && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {shift.notes}
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

  // Enhanced staff assignment functions with swapping support
  const handleStaffDrop = useCallback(async (targetDay, targetShiftIndex, targetRoleId, staffId, sourceInfo = null) => {
    try {
      const targetDayKey = format(targetDay, 'yyyy-MM-dd');
      
      // Check for conflicts
      const conflicts = getStaffConflicts(staffId, targetDay, targetRoleId);
      if (conflicts.length > 0) {
        // Special handling for on-call staff
        const staffMember = getStaffById(staffId);
        if (staffMember && staffMember.on_call) {
          const proceed = window.confirm(
            `⚠️ ON CALL STAFF: ${staffMember.name} is currently on call and not available for regular scheduling.\n\n` +
            `Are you sure you want to assign them to this shift?`
          );
          if (!proceed) {
            return;
          }
        } else {
          alert(`Warning: ${conflicts.join(', ')}`);
        }
      }

      updateLocalSchedule(prev => {
        const newSchedule = { ...prev };
        
        // Get the target shift and role
        const targetShift = newSchedule[targetDayKey]?.shifts?.[targetShiftIndex];
        if (!targetShift) return prev;
        
        const targetRoleAssignedStaff = targetShift.assignedStaff?.[targetRoleId];
        
        // If there's already staff in the target role, we need to swap
        if (targetRoleAssignedStaff && sourceInfo) {
          console.log('Swapping staff:', { 
            from: { day: sourceInfo.dayKey, shiftIndex: sourceInfo.shiftIndex, roleId: sourceInfo.roleId, staffId: targetRoleAssignedStaff },
            to: { day: targetDayKey, shiftIndex: targetShiftIndex, roleId: targetRoleId, staffId }
          });
          
          // Swap: Move target staff to source location
          const sourceDayKey = sourceInfo.dayKey;
          const sourceShift = newSchedule[sourceDayKey]?.shifts?.[sourceInfo.shiftIndex];
          if (sourceShift) {
            sourceShift.assignedStaff = {
              ...sourceShift.assignedStaff,
              [sourceInfo.roleId]: targetRoleAssignedStaff
            };
          }
          
          // Move dragged staff to target location
          targetShift.assignedStaff = {
            ...targetShift.assignedStaff,
            [targetRoleId]: staffId
          };
          
        } else if (sourceInfo) {
          // Moving to empty slot: remove from source and add to target
          console.log('Moving staff:', { 
            from: { day: sourceInfo.dayKey, shiftIndex: sourceInfo.shiftIndex, roleId: sourceInfo.roleId },
            to: { day: targetDayKey, shiftIndex: targetShiftIndex, roleId: targetRoleId, staffId }
          });
          
          // Remove from source location
          const sourceDayKey = sourceInfo.dayKey;
          const sourceShift = newSchedule[sourceDayKey]?.shifts?.[sourceInfo.shiftIndex];
          if (sourceShift) {
            sourceShift.assignedStaff = {
              ...sourceShift.assignedStaff,
              [sourceInfo.roleId]: undefined
            };
          }
          
          // Add to target location
          targetShift.assignedStaff = {
            ...targetShift.assignedStaff,
            [targetRoleId]: staffId
          };
          
        } else {
          // Simple assignment (from staff panel or popup)
          console.log('Assigning staff:', { 
            to: { day: targetDayKey, shiftIndex: targetShiftIndex, roleId: targetRoleId, staffId }
          });
          
          targetShift.assignedStaff = {
            ...targetShift.assignedStaff,
            [targetRoleId]: staffId
          };
        }
        
        return newSchedule;
      });
      
    } catch (error) {
      console.error('Error in staff drop:', error);
    }
  }, [updateLocalSchedule]);

  const getStaffConflicts = (staffId, day, roleId) => {
    const conflicts = [];
    
    const staffMember = getStaffById(staffId);
    console.log(`🔍 getStaffConflicts called for ${staffMember?.name}:`, { staffId, day, roleId, dayType: typeof day });
    
    // Validate day parameter
    if (!day || !(day instanceof Date) || isNaN(day.getTime())) {
      console.warn('getStaffConflicts: Invalid day parameter:', day);
      return conflicts;
    }
    
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = localSchedule[dayKey];
    
    console.log(`🔍 Checking conflicts for ${staffMember?.name} on ${dayKey}:`, { hasSchedule: !!daySchedule });
    
    if (!daySchedule) return conflicts;

    // Check if staff is already assigned elsewhere on this day (excluding current role)
    const isAlreadyAssignedToday = daySchedule.shifts.some(shift => 
      Object.entries(shift.assignedStaff || {}).some(([currentRoleId, assignedStaffId]) => 
        assignedStaffId === staffId && currentRoleId !== roleId
      )
    );
    
    if (isAlreadyAssignedToday) {
      conflicts.push('Staff already assigned on this day');
    }

    // Check time off
    const timeOff = getTimeOffByStaffId(staffId);
    if (timeOff && timeOff.some(request => 
      request.start_date <= dayKey && request.end_date >= dayKey
    )) {
      conflicts.push('Staff has time off');
    }

    // Check on-call status
    if (staffMember && staffMember.on_call) {
      conflicts.push('Staff is on call - not available for regular scheduling');
      console.log(`🚫 ${staffMember.name} is ON CALL - Adding conflict`);
    }

    // Check availability
    if (staffMember && staffMember.availability) {
      const dayOfWeek = DAYS_OF_WEEK[day.getDay()];
      
      // Enhanced debugging for date handling
      
      // Ensure availability is an array
      let availabilityArray = staffMember.availability;
      if (typeof availabilityArray === 'string') {
        try {
          availabilityArray = JSON.parse(availabilityArray);
        } catch (e) {
          console.warn(`Could not parse availability for ${staffMember.name}:`, availabilityArray);
          availabilityArray = [];
        }
      }
      
      if (!Array.isArray(availabilityArray)) {
        console.warn(`Availability is not an array for ${staffMember.name}:`, availabilityArray);
        availabilityArray = [];
      }
      
      
      
      if (!availabilityArray.includes(dayOfWeek)) {
        conflicts.push(`Staff not available on ${dayOfWeek}`);
      }
    }

    return conflicts;
  };

  const removeStaffAssignment = (dayKey, shiftIndex, roleId) => {
    updateLocalSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        shifts: prev[dayKey].shifts.map((shift, index) => 
          index === shiftIndex 
            ? { 
                ...shift, 
                assignedStaff: { 
                  ...shift.assignedStaff, 
                  [roleId]: undefined 
                } 
              }
            : shift
        )
      }
    }));
  };

  // Tour color change handler
  const handleTourColorChange = (day, shiftIndex, tourId, color) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    updateLocalSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        shifts: prev[dayKey].shifts.map((shift, index) => 
          index === shiftIndex 
            ? { 
                ...shift, 
                tourColors: { 
                  ...shift.tourColors, 
                  [tourId]: color 
                } 
              }
            : shift
        )
      }
    }));
  };

  // Staff color change handler
  const handleStaffColorChange = (day, shiftIndex, staffId, color) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    updateLocalSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        shifts: prev[dayKey].shifts.map((shift, index) => 
          index === shiftIndex 
            ? { 
                ...shift, 
                staffColors: { 
                  ...shift.staffColors, 
                  [staffId]: color 
                } 
              }
            : shift
        )
      }
    }));
  };

  // Helper function to parse time from tour name (e.g., "9:00 AM" -> 540 minutes)
  const parseTimeFromTourName = (tourName) => {
    // Match patterns like "9:00 AM", "2:30 PM", "12:15 PM", etc.
    const timeMatch = tourName.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) {
      console.log(`⚠️ Could not parse time from tour name: "${tourName}"`);
      return 0; // Default to midnight if no time found
    }
    
    const [, hours, minutes, period] = timeMatch;
    let totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    
    // Convert to 24-hour format
    if (period.toUpperCase() === 'PM' && hours !== '12') {
      totalMinutes += 12 * 60;
    } else if (period.toUpperCase() === 'AM' && hours === '12') {
      totalMinutes -= 12 * 60;
    }
    
    console.log(`🕐 Parsed "${tourName}" -> ${totalMinutes} minutes (${hours}:${minutes} ${period})`);
    return totalMinutes;
  };

  // Helper function to get tours for a shift
  const getShiftTours = (shift) => {
    if (!shift.tours || shift.tours.length === 0) {
      console.log(`🔍 Shift "${shift.name}" has no tours:`, shift.tours);
      return [];
    }
    
    console.log(`🔍 Shift "${shift.name}" tours array:`, shift.tours);
    console.log(`🔍 Global tours array:`, tours?.length, 'tours available');
    
    // Get tour objects from the global tours array
    const shiftTours = shift.tours.map(tourId => {
      const tour = tours?.find(tour => tour.id === tourId);
      console.log(`🔍 Looking for tour ${tourId}:`, tour ? tour.name : 'NOT FOUND');
      return tour;
    }).filter(Boolean); // Remove any undefined tours
    
    console.log(`🔍 Found tours for shift "${shift.name}":`, shiftTours.map(t => t.name));
    
    // Sort tours by time (morning to evening) for chronological display order
    const sortedTours = shiftTours.sort((a, b) => {
      const timeA = parseTimeFromTourName(a.name);
      const timeB = parseTimeFromTourName(b.name);
      console.log(`📊 Comparing "${a.name}" (${timeA}) vs "${b.name}" (${timeB}) -> ${timeA - timeB}`);
      return timeA - timeB;
    });
    
    console.log(`✅ Final sorted order:`, sortedTours.map(t => t.name));
    return sortedTours;
  };

  // Template management functions
  const handleSaveAsTemplate = (day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = localSchedule[dayKey];
    
    if (!daySchedule || !daySchedule.shifts || daySchedule.shifts.length === 0) {
      alert('No shifts to save as template for this day.');
      return;
    }
    
    setSelectedDay(day);
    setOpenTemplateDialog(true);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name.');
      return;
    }
    
    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    const daySchedule = localSchedule[dayKey];
    
    const newTemplate = {
      id: `template_${Date.now()}`,
      name: templateName.trim(),
      dayOfWeek: format(selectedDay, 'EEEE'),
      shifts: daySchedule.shifts.map(shift => ({
        ...shift,
        id: `template_${shift.id}`, // Change ID to avoid conflicts
        assignedStaff: {} // Clear staff assignments for template
      })),
      createdAt: new Date().toISOString()
    };
    
    setDayTemplates(prev => [...prev, newTemplate]);
    setTemplateName('');
    setOpenTemplateDialog(false);
    setSelectedDay(null);
    
    alert(`Template "${newTemplate.name}" saved successfully!`);
  };

  const handleLoadTemplate = (template) => {
    if (!selectedDay) {
      alert('Please select a day first.');
      return;
    }
    
    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    const daySchedule = localSchedule[dayKey] || { shifts: [] };
    
    // Add template shifts to the selected day
    const templateShifts = template.shifts.map(shift => ({
      ...shift,
      id: `${shift.id}_${Date.now()}`, // Generate new unique ID
      assignedStaff: {} // Clear staff assignments
    }));
    
    updateLocalSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...daySchedule,
        shifts: [...daySchedule.shifts, ...templateShifts]
      }
    }));
    
    setOpenLoadTemplateDialog(false);
    setSelectedTemplate(null);
    
    alert(`Template "${template.name}" loaded successfully!`);
  };

  // Day actions menu handlers
  const handleDayActionsMenuOpen = (event, day) => {
    setDayActionsMenuAnchor(event.currentTarget);
    setSelectedDayForActions(day);
  };

  const handleDayActionsMenuClose = () => {
    setDayActionsMenuAnchor(null);
    setSelectedDayForActions(null);
  };

  const handleCreateCustomShiftFromMenu = () => {
    setSelectedDay(selectedDayForActions);
    setOpenCustomShiftDialog(true);
    handleDayActionsMenuClose();
  };

  const handleSaveTemplateFromMenu = () => {
    handleSaveAsTemplate(selectedDayForActions);
    handleDayActionsMenuClose();
  };

  const handleLoadTemplateFromMenu = () => {
    setSelectedDay(selectedDayForActions);
    setOpenLoadTemplateDialog(true);
    handleDayActionsMenuClose();
  };

  // Staff filtering function for the selection dialog
  const getFilteredAndSortedStaff = (targetRoleId, targetDay) => {
    // First apply filters
    let filtered = [...(staff || [])];
    
    // Filter by role (must be trained for the target role)
    if (targetRoleId) {
      filtered = filtered.filter(member => 
        (member.trained_roles || []).includes(targetRoleId)
      );
    }
    
    // Filter by on-call status
    if (staffFilterOnCall) {
      // Show only on-call staff
      filtered = filtered.filter(member => member.on_call);
    } else {
      // Show only non-on-call staff (default behavior)
      filtered = filtered.filter(member => !member.on_call);
    }
    
    // Filter by days (staff must be available on the target day)
    if (targetDay && targetDay instanceof Date && !isNaN(targetDay.getTime())) {
      const dayOfWeek = DAYS_OF_WEEK[targetDay.getDay()];
      filtered = filtered.filter(member => {
        // Ensure availability is an array
        let memberAvailability = member.availability || [];
        if (typeof memberAvailability === 'string') {
          try {
            memberAvailability = JSON.parse(memberAvailability);
          } catch (e) {
            console.warn(`Could not parse availability for ${member.name}:`, memberAvailability);
            memberAvailability = [];
          }
        }
        
        if (!Array.isArray(memberAvailability)) {
          memberAvailability = [];
        }
        
        return memberAvailability.includes(dayOfWeek);
      });
    }
    
    // Apply additional filters from dialog
    if (staffFilterByRole) {
      filtered = filtered.filter(member => 
        (member.trained_roles || []).includes(staffFilterByRole)
      );
    }
    
    if (staffFilterByDays.length > 0) {
      filtered = filtered.filter(member => {
        // Ensure availability is an array
        let memberAvailability = member.availability || [];
        if (typeof memberAvailability === 'string') {
          try {
            memberAvailability = JSON.parse(memberAvailability);
          } catch (e) {
            console.warn(`Could not parse availability for ${member.name}:`, memberAvailability);
            memberAvailability = [];
          }
        }
        
        if (!Array.isArray(memberAvailability)) {
          memberAvailability = [];
        }
        
        return staffFilterByDays.every(day => memberAvailability.includes(day));
      });
    }
    
    // Then apply sorting
    const sorted = filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (staffSortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (staffSortBy === 'hireDate') {
        aValue = a.hire_date ? new Date(a.hire_date) : new Date(0);
        bValue = b.hire_date ? new Date(b.hire_date) : new Date(0);
      }
      
      if (aValue < bValue) return staffSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return staffSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  // Open staff selection dialog
  const handleOpenStaffSelection = (day, shiftIndex, roleId) => {
    console.log('Opening staff selection dialog:', { day, shiftIndex, roleId, dayType: typeof day, isValidDate: day instanceof Date && !isNaN(day.getTime()) });
    setSelectedDay(day);
    setSelectedShiftIndex(shiftIndex);
    setSelectedRoleId(roleId);
    setOpenStaffSelectionDialog(true);
    
    // Reset filters to show all available staff for this role/day
    setStaffFilterByRole('');
    setStaffFilterByDays([]);
  };

  // Handle staff selection from dialog
  const handleStaffSelection = (staffId) => {
    console.log('Staff selected:', staffId);
    console.log('Context:', { selectedDay, selectedShiftIndex, selectedRoleId });
    
    if (selectedDay && selectedShiftIndex !== null && selectedRoleId) {
      console.log('Calling handleStaffDrop with:', { selectedDay, selectedShiftIndex, selectedRoleId, staffId });
      handleStaffDrop(selectedDay, selectedShiftIndex, selectedRoleId, staffId);
    } else {
      console.error('Missing context for staff selection:', { selectedDay, selectedShiftIndex, selectedRoleId });
    }
    setOpenStaffSelectionDialog(false);
  };

  // Auto-assignment function
  const handleAutoAssign = async () => {
    setIsAutoAssigning(true);
    setAssignmentResults(null);
    
    try {
      
      let totalRoles = 0;
      let assignedRoles = 0;
      const assignmentDetails = [];

      // Get all roles that need assignment
      const rolesToAssign = [];
      Object.keys(localSchedule).forEach(dayKey => {
        const daySchedule = localSchedule[dayKey];
        console.log(`📅 Processing day ${dayKey}:`, daySchedule);
        
        daySchedule.shifts?.forEach((shift, shiftIndex) => {
          console.log(`🔄 Processing shift "${shift.name}":`, shift);
          
          if (shift.required_roles || shift.requiredRoles) {
            const requiredRoles = shift.required_roles || shift.requiredRoles;
            console.log(`👥 Required roles for "${shift.name}":`, requiredRoles);
            
            requiredRoles.forEach(roleId => {
              if (!shift.assignedStaff?.[roleId]) {
                const role = getRoleById(roleId);
                console.log(`➕ Adding role to assignment queue:`, { roleId, roleName: role?.name, tier: role?.tier });
                
                rolesToAssign.push({
                  dayKey,
                  shiftIndex,
                  roleId,
                  shiftName: shift.name,
                  tier: role?.tier || 1
                });
                totalRoles++;
              }
            });
          }
        });
      });

      
      // Debug: Show available roles and staff training

      // Sort by tier (1 = highest priority)
      rolesToAssign.sort((a, b) => a.tier - b.tier);

      // Assign staff to roles
      const assignedStaffToday = {}; // Track staff assignments per day
      
      for (const roleAssignment of rolesToAssign) {
        const { dayKey, shiftIndex, roleId } = roleAssignment;
        const role = getRoleById(roleId);
        
        console.log(`🔍 Processing role assignment:`, { roleAssignment, role });
        
        if (!role) {
          console.log(`❌ Role not found for ID: ${roleId}`);
          continue;
        }
        
        // Debug: Check if any staff are trained for this role
        const trainedStaffForRole = staff?.filter(s => s.trained_roles?.includes(roleId));
        console.log(`🎓 Staff trained for "${role.name}":`, trainedStaffForRole?.map(s => s.name) || []);

        // Find available staff for this role
        const availableStaff = staff?.filter(staffMember => {
          // Check if staff is trained for this role
          const isTrained = staffMember.trained_roles?.includes(roleId);
          console.log(`👤 Checking staff ${staffMember.name}:`, { 
            trained_roles: staffMember.trained_roles, 
            isTrained, 
            roleId,
            roleName: role?.name,
            availability: staffMember.availability
          });
          
          if (!isTrained) {
            console.log(`❌ ${staffMember.name} not trained for role ${roleId}`);
            return false;
          }

          // Check if staff is already assigned today (in current auto-assignment run)
          if (assignedStaffToday[dayKey]?.includes(staffMember.id)) {
            console.log(`❌ ${staffMember.name} already assigned today in auto-assignment run`);
            return false;
          }

          // Check for conflicts - create date in local timezone to avoid UTC conversion issues
          const [year, month, day] = dayKey.split('-').map(Number);
          const localDate = new Date(year, month - 1, day); // month is 0-indexed
          const conflicts = getStaffConflicts(staffMember.id, localDate, roleId);
          console.log(`⚠️ Conflicts for ${staffMember.name}:`, conflicts);
          
          if (conflicts.length > 0) {
            console.log(`❌ ${staffMember.name} has conflicts: ${conflicts.join(', ')} - REJECTING ASSIGNMENT`);
            return false;
          }
          
          // Additional check for Bruce specifically
          if (staffMember.name === 'Bruce Consuegra') {
            console.log(`🔍 BRUCE AUTO-ASSIGN CHECK:`, {
              name: staffMember.name,
              dayKey,
              dayOfWeek: DAYS_OF_WEEK[new Date(dayKey).getDay()],
              availability: staffMember.availability,
              conflicts,
              willAssign: conflicts.length === 0
            });
          }
          
          console.log(`✅ ${staffMember.name} is available for role ${roleId}`);
          return true;
        }) || [];

        console.log(`✅ Available staff for role "${role.name}":`, availableStaff.length);

        if (availableStaff.length > 0) {
          // Sort available staff by target shift priority (highest target gap first)
          const staffWithPriority = availableStaff.map(staffMember => {
            const currentAssignments = assignedStaffToday[dayKey]?.filter(id => id === staffMember.id).length || 0;
            const targetShifts = staffMember.target_shifts || staffMember.targetShifts || 5;
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
          const selectedStaff = staffWithPriority[0].staffMember;
          console.log(`🎯 ATTEMPTING TO ASSIGN ${selectedStaff.name} to role "${role.name}" on ${dayKey} (target gap: ${staffWithPriority[0].targetGap})`);
          
          // Double-check conflicts before assignment - create date in local timezone
          const [year, month, day] = dayKey.split('-').map(Number);
          const localDate = new Date(year, month - 1, day); // month is 0-indexed
          const finalConflicts = getStaffConflicts(selectedStaff.id, localDate, roleId);
          if (finalConflicts.length > 0) {
            console.log(`🚨 FINAL CHECK: ${selectedStaff.name} has conflicts ${finalConflicts.join(', ')} - ABORTING ASSIGNMENT`);
            continue;
          }
          
          console.log(`✅ FINAL CHECK PASSED: ${selectedStaff.name} has no conflicts - PROCEEDING WITH ASSIGNMENT`);
          
          // Track this assignment
          if (!assignedStaffToday[dayKey]) {
            assignedStaffToday[dayKey] = [];
          }
          assignedStaffToday[dayKey].push(selectedStaff.id);
          
          updateLocalSchedule(prev => ({
            ...prev,
            [dayKey]: {
              ...prev[dayKey],
              shifts: prev[dayKey].shifts.map((shift, index) => 
                index === shiftIndex 
                  ? { 
                      ...shift, 
                      assignedStaff: { 
                        ...shift.assignedStaff, 
                        [roleId]: selectedStaff.id 
                      } 
                    }
                  : shift
              )
            }
          }));

          assignedRoles++;
          assignmentDetails.push({
            role: role.name,
            staff: selectedStaff.name,
            shift: roleAssignment.shiftName,
            day: format(new Date(dayKey), 'EEE'),
            tier: `Tier ${roleAssignment.tier}`
          });
        } else {
          console.log(`❌ No available staff for role "${role.name}"`);
        }
      }


      setAssignmentResults({
        totalRoles,
        assignedRoles,
        unassignedRoles: totalRoles - assignedRoles,
        assignmentDetails
      });

    } catch (error) {
      console.error('Auto-assignment error:', error);
      alert('Auto-assignment failed: ' + error.message);
    } finally {
      setIsAutoAssigning(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Schedule Builder
      </Typography>
      
      {/* Week Navigation */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 2 : 0
      }}>
        <Typography variant="h6">
          Week: {format(weekStart, 'MMM d, yyyy')} (Key: {weekKey})
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 1 : 2,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          justifyContent: isMobile ? 'center' : 'flex-end'
        }}>
          <Button
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            onClick={() => setSelectedWeek(prev => addDays(prev, -7))}
            sx={{ 
              minWidth: 'auto',
              px: isMobile ? 1 : 2
            }}
          >
            <ChevronLeftIcon />
          </Button>
          
          <Button
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            onClick={() => setSelectedWeek(new Date())}
            startIcon={!isMobile ? <TodayIcon /> : null}
            sx={{ 
              minWidth: isMobile ? 'auto' : 'auto',
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}
          >
            {isMobile ? 'Today' : 'Current Week'}
          </Button>
          
          <Button
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            onClick={() => setSelectedWeek(prev => addDays(prev, 7))}
            sx={{ 
              minWidth: 'auto',
              px: isMobile ? 1 : 2
            }}
          >
            <ChevronRightIcon />
          </Button>
        </Box>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 1 : 2, 
          mb: 2, 
          flexWrap: 'wrap',
          justifyContent: isMobile ? 'center' : 'flex-start'
        }}>
          <Button 
            variant="outlined" 
            onClick={handleTestClear}
            size={isMobile ? "small" : "medium"}
            sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          >
            {isMobile ? 'Clear Staff' : 'Clear Staff'}
          </Button>
          <Button 
            variant="outlined" 
            color="warning" 
            onClick={handleClearShifts}
            size={isMobile ? "small" : "medium"}
            sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          >
            {isMobile ? 'Clear Shifts' : 'Clear Shifts'}
          </Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleTestSave}
            disabled={!hasUnsavedChanges}
            size={isMobile ? "small" : "medium"}
            sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          >
            {isMobile ? 'Save' : 'Save'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleTestReset}
            size={isMobile ? "small" : "medium"}
            sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          >
            {isMobile ? 'Reset' : 'Reset'}
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleAutoAssign}
            disabled={isAutoAssigning}
            startIcon={<AutoAssignIcon />}
            size={isMobile ? "small" : "medium"}
            sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
          >
            {isAutoAssigning ? (isMobile ? 'Assigning...' : 'Assigning...') : (isMobile ? 'Assign' : 'Assign')}
          </Button>
        </Box>
        
        <Alert severity={hasUnsavedChanges ? 'warning' : 'success'} sx={{ mb: 2 }}>
          {hasUnsavedChanges ? 'You have unsaved changes' : 'All changes saved'}
        </Alert>
        
        {assignmentResults && (
          <Alert 
            severity={assignmentResults.unassignedRoles === 0 ? 'success' : 'warning'} 
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              Auto-assignment complete: {assignmentResults.assignedRoles}/{assignmentResults.totalRoles} roles assigned
              {assignmentResults.unassignedRoles > 0 && ` • ${assignmentResults.unassignedRoles} roles could not be assigned`}
            </Typography>
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary">
          Dirty: {isDirty ? 'Yes' : 'No'} | Unsaved: {hasUnsavedChanges ? 'Yes' : 'No'}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {weekDates.map((day, dayIndex) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayData = localSchedule[dayKey] || { shifts: [] };
          const dayOfWeek = DAYS_OF_WEEK[dayIndex];
          
          return (
            <Grid item xs={12} key={dayKey}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      {dayOfWeek} - {format(day, 'MMM d')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {/* Add Shifts Button - Primary action, keep visible */}
                      <Button
                        size="small"
                        startIcon={<AddCircleIcon />}
                        onClick={() => {
                          setSelectedDay(day);
                          setOpenShiftDialog(true);
                        }}
                        variant="outlined"
                        sx={{ 
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                          px: isMobile ? 1 : 1.5
                        }}
                      >
                        {isMobile ? 'Add' : 'Add Shifts'}
                      </Button>
                      
                      {/* Day Actions Dropdown Menu */}
                      <IconButton
                        size="small"
                        onClick={(event) => handleDayActionsMenuOpen(event, day)}
                        sx={{ 
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {renderScheduleTable(day, dayIndex)}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Day Actions Dropdown Menu */}
      <Menu
        anchorEl={dayActionsMenuAnchor}
        open={Boolean(dayActionsMenuAnchor)}
        onClose={handleDayActionsMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleCreateCustomShiftFromMenu}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create Custom Shift</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            handleClearDay(format(selectedDayForActions, 'yyyy-MM-dd'));
            handleDayActionsMenuClose();
          }}
          disabled={!selectedDayForActions || !localSchedule[format(selectedDayForActions, 'yyyy-MM-dd')]?.shifts?.length}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Clear Day</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={handleSaveTemplateFromMenu}
          disabled={!selectedDayForActions || !localSchedule[format(selectedDayForActions, 'yyyy-MM-dd')]?.shifts?.length}
        >
          <ListItemIcon>
            <TemplateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Save as Template</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleLoadTemplateFromMenu}>
          <ListItemIcon>
            <TemplateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Load Template</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Add Shifts Dialog */}
      <Dialog 
        open={openShiftDialog} 
        onClose={() => {
          setOpenShiftDialog(false);
          setSelectedShifts([]);
        }} 
        maxWidth="md" 
        fullWidth
      >
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
                    <Typography color="primary">✓</Typography>
                  ) : (
                    <Typography color="text.secondary">○</Typography>
                  )}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" fontWeight="medium">
                    {shift.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {shift.description || 'No description available'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShiftDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddShiftsToDay}
            variant="contained"
            disabled={selectedShifts.length === 0}
          >
            Add {selectedShifts.length} Shift{selectedShifts.length !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Shift Creation Dialog */}
      <Dialog 
        open={openCustomShiftDialog} 
        onClose={() => {
          setOpenCustomShiftDialog(false);
          // Reset form when dialog closes
          setShiftName('');
          setShiftDescription('');
          setDefaultStartingTime('');
          setSelectedRoles([]);
          setSelectedTours([]);
          setIsTeamEvent(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create Custom Shift</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Shift Name *"
              value={shiftName}
              onChange={(e) => setShiftName(e.target.value)}
              placeholder="e.g., Morning Adventure"
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={shiftDescription}
              onChange={(e) => setShiftDescription(e.target.value)}
              placeholder="Describe what this shift involves..."
              fullWidth
              multiline
              rows={3}
            />
            
            <TextField
              label="Default Starting Time (Optional)"
              type="time"
              value={defaultStartingTime}
              onChange={(e) => setDefaultStartingTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="This time will be pre-filled in the arrival time slot when this shift is used"
              fullWidth
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={isTeamEvent}
                  onChange={(e) => setIsTeamEvent(e.target.checked)}
                  color="primary"
                />
              }
              label="Team Event (Assigns all staff members)"
            />
            
            {isTeamEvent && (
              <Alert severity="info">
                This shift will automatically assign all staff members when added to a schedule.
              </Alert>
            )}
            
            <FormControl fullWidth required>
              <InputLabel>Required Roles *</InputLabel>
              <Select
                multiple
                value={selectedRoles}
                onChange={(e) => setSelectedRoles(e.target.value)}
                input={<OutlinedInput label="Required Roles *" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const role = roles?.find(r => r.id === value);
                      return (
                        <MuiChip 
                          key={value} 
                          label={role?.name || value}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {(roles || []).map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MuiChip 
                        label={`Tier ${role.tier || 1}`}
                        size="small"
                        color={role.tier === 1 ? 'error' : role.tier === 2 ? 'warning' : 'default'}
                        variant="outlined"
                      />
                      <Typography>{role.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Attach Tours (Optional)</InputLabel>
              <Select
                multiple
                value={selectedTours}
                onChange={(e) => setSelectedTours(e.target.value)}
                input={<OutlinedInput label="Attach Tours (Optional)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const tour = tours?.find(t => t.id === value);
                      return (
                        <MuiChip 
                          key={value} 
                          label={tour?.name || value}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {(tours || []).map((tour) => (
                  <MenuItem key={tour.id} value={tour.id}>
                    {tour.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedRoles.length === 0 && (
              <Alert severity="warning">
                Please select at least one required role for this shift.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCustomShiftDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddCustomShift}
            variant="contained"
            disabled={!shiftName.trim() || selectedRoles.length === 0}
          >
            Create Custom Shift
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog 
        open={openNotesDialog} 
        onClose={() => setOpenNotesDialog(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            Edit Notes for {selectedShiftData?.name}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for this shift..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNotesDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveNotes}
            variant="contained"
          >
            Save Notes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Staff Selection Dialog */}
      <Dialog 
        open={openStaffSelectionDialog} 
        onClose={() => setOpenStaffSelectionDialog(false)} 
        maxWidth="md" 
        fullWidth
        disableScrollLock={false}
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">
            Select Staff for {selectedRoleId && getRoleById(selectedRoleId)?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedDay && format(selectedDay, 'EEEE, MMMM d')}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ pt: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Filter Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Filter by:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={staffFilterByRole}
                  onChange={(e) => setStaffFilterByRole(e.target.value)}
                  label="Role"
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {(roles || []).map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Available on</InputLabel>
                <Select
                  multiple
                  value={staffFilterByDays}
                  onChange={(e) => setStaffFilterByDays(e.target.value)}
                  label="Available on"
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'All Days';
                    if (selected.length === 1) return selected[0];
                    if (selected.length === 7) return 'All Days';
                    return `${selected.length} days`;
                  }}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Sort Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Sort by:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={staffSortBy}
                    onChange={(e) => setStaffSortBy(e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="name">Name</MenuItem>
                    <MenuItem value="hireDate">Hire Date</MenuItem>
                  </Select>
                </FormControl>
                <IconButton
                  size="small"
                  onClick={() => setStaffSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  {staffSortDirection === 'asc' ? '↑' : '↓'}
                </IconButton>
              </Box>
              
              {/* On-Call Filter */}
              <FormControlLabel
                control={
                  <Switch
                    checked={staffFilterOnCall}
                    onChange={(e) => setStaffFilterOnCall(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Show on-call staff only
                  </Typography>
                }
                sx={{ ml: 0 }}
              />
              
              {/* Clear Filters Button */}
              {(staffFilterByRole || staffFilterByDays.length > 0 || staffFilterOnCall) && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setStaffFilterByRole('');
                    setStaffFilterByDays([]);
                    setStaffFilterOnCall(false);
                  }}
                  sx={{ color: 'text.secondary' }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
            
            {/* Staff List */}
            <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {getFilteredAndSortedStaff(selectedRoleId, selectedDay).map((staffMember) => {
                const conflicts = selectedDay ? getStaffConflicts(staffMember.id, selectedDay, selectedRoleId) : [];
                const hasConflicts = conflicts.length > 0;
                
                return (
                  <Box 
                    key={staffMember.id}
                    sx={{ 
                      mb: 0.5, 
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: hasConflicts ? 'warning.main' : 'divider',
                      borderRadius: 1,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '&:hover': { 
                        bgcolor: hasConflicts ? 'warning.50' : 'action.hover' 
                      }
                    }}
                    onClick={() => handleStaffSelection(staffMember.id)}
                  >
                    <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24, fontSize: '0.7rem' }}>
                      {staffMember.name.charAt(0)}
                    </Avatar>
                    <Typography variant="body2" fontWeight="medium" sx={{ flexGrow: 1 }}>
                      {staffMember.name}
                    </Typography>
                    {hasConflicts && (
                      <Tooltip title={conflicts.join(', ')}>
                        <WarningIcon color="warning" sx={{ fontSize: '1rem' }} />
                      </Tooltip>
                    )}
                  </Box>
                );
              })}
              
              {getFilteredAndSortedStaff(selectedRoleId, selectedDay).length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No staff members found matching the current filters
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStaffSelectionDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={openTemplateDialog} onClose={() => setOpenTemplateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Day as Template</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Template Name"
            placeholder="e.g., Busy Saturday, Morning Rush"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            margin="normal"
            autoFocus
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will save all shifts from {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'the selected day'} as a reusable template.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTemplateDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={!templateName.trim()}>
            Save Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={openLoadTemplateDialog} onClose={() => setOpenLoadTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Load Day Template</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a template to load into {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'the selected day'}.
          </Typography>
          
          {dayTemplates.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No templates saved yet.</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Create a template by clicking "Save Template" on any day with shifts.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {dayTemplates.map((template) => (
                <Card key={template.id} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6">{template.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {template.dayOfWeek} • {template.shifts.length} shift{template.shifts.length !== 1 ? 's' : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created {format(new Date(template.createdAt), 'MMM d, yyyy')}
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        Load
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLoadTemplateDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      </Box>
    </DndProvider>
  );
}

export default ScheduleBuilderV2;
