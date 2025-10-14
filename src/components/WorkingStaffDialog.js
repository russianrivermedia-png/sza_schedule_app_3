import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Stack,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { useData } from '../context/DataContext';

function WorkingStaffDialog({ open, onClose, currentWeek }) {
  const { staff, roles, schedules } = useData();
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [workingStaff, setWorkingStaff] = useState([]);

  // Generate week options (current week + 4 previous weeks)
  const generateWeekOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 5; i++) {
      const weekStart = startOfWeek(addDays(currentDate, -i * 7));
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const weekEnd = addDays(weekStart, 6);
      
      options.push({
        value: weekKey,
        label: `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`
      });
    }
    
    return options;
  };

  // Get staff assignments for the selected week
  const getStaffAssignments = () => {
    if (!staff || !schedules) return [];

    // Find the schedule for the selected week
    const weekSchedule = schedules.find(schedule => 
      schedule.week_key === selectedWeek || 
      schedule.days?.week_key === selectedWeek
    );

    if (!weekSchedule?.days) return [];

    const staffAssignments = new Map();

    // Process each day in the week
    Object.keys(weekSchedule.days).forEach(dayKey => {
      if (dayKey === 'week_key' || dayKey === 'week_start') return;
      
      const dayData = weekSchedule.days[dayKey];
      if (!dayData.shifts) return;

      dayData.shifts.forEach(shift => {
        if (shift.assignedStaff) {
          Object.entries(shift.assignedStaff).forEach(([roleId, staffId]) => {
            if (staffId) {
              if (!staffAssignments.has(staffId)) {
                staffAssignments.set(staffId, {
                  staffId,
                  shifts: [],
                  roles: new Set()
                });
              }
              
              const assignment = staffAssignments.get(staffId);
              assignment.shifts.push({
                day: dayKey,
                shiftName: shift.name,
                arrivalTime: shift.arrivalTime,
                roleId
              });
              assignment.roles.add(roleId);
            }
          });
        }
      });
    });

    // Convert to array and add staff details
    return Array.from(staffAssignments.values())
      .map(assignment => {
        const staffMember = staff.find(s => s.id === assignment.staffId);
        if (!staffMember) return null;

        const targetShifts = staffMember.target_shifts || staffMember.targetShifts || 5;
        const currentShifts = assignment.shifts.length;
        const targetGap = targetShifts - currentShifts;

        return {
          ...staffMember,
          currentShifts,
          targetShifts,
          targetGap,
          assignedRoles: Array.from(assignment.roles),
          shiftDetails: assignment.shifts
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  };

  // Update working staff when week changes
  useEffect(() => {
    if (open && staff && schedules) {
      setWorkingStaff(getStaffAssignments());
    }
  }, [open, selectedWeek, staff, schedules]);

  // Get status color and icon
  const getStatusInfo = (targetGap) => {
    if (targetGap === 0) {
      return {
        color: 'success',
        icon: <CheckCircleIcon sx={{ fontSize: 16 }} />,
        text: 'On Target'
      };
    } else if (targetGap > 0) {
      return {
        color: 'warning',
        icon: <TrendingDownIcon sx={{ fontSize: 16 }} />,
        text: `${targetGap} Under`
      };
    } else {
      return {
        color: 'error',
        icon: <TrendingUpIcon sx={{ fontSize: 16 }} />,
        text: `${Math.abs(targetGap)} Over`
      };
    }
  };

  // Get role names for hover tooltip
  const getRoleNames = (roleIds) => {
    return roleIds.map(roleId => {
      const role = roles.find(r => r.id === roleId);
      return role ? role.name : 'Unknown Role';
    }).join(', ');
  };

  const weekOptions = generateWeekOptions();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box>
          <Typography variant="h6" component="div">
            Working Staff Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Week of {format(parseISO(selectedWeek), 'MMM dd, yyyy')}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Week Selector */}
        <Box sx={{ mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Week</InputLabel>
            <Select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              label="Select Week"
            >
              {weekOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Staff Cards Grid */}
        <Grid container spacing={2}>
          {workingStaff.map((staffMember) => {
            const statusInfo = getStatusInfo(staffMember.targetGap);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={staffMember.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: statusInfo.color === 'success' ? '2px solid' : '1px solid',
                    borderColor: statusInfo.color === 'success' ? 'success.main' : 'divider',
                    position: 'relative'
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Status Badge */}
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <Chip
                        icon={statusInfo.icon}
                        label={statusInfo.text}
                        size="small"
                        color={statusInfo.color}
                        variant="filled"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>

                    {/* Staff Name */}
                    <Tooltip 
                      title={`Roles: ${getRoleNames(staffMember.assignedRoles)}`}
                      arrow
                      placement="top"
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 'bold',
                          mb: 1,
                          pr: 6, // Space for status badge
                          cursor: 'help'
                        }}
                      >
                        {staffMember.name.split(' ')[0]}
                      </Typography>
                    </Tooltip>

                    {/* Shift Count */}
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Current Shifts:
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {staffMember.currentShifts}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Target Shifts:
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {staffMember.targetShifts}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 0.5 }} />

                      {/* Progress Bar */}
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Progress: {staffMember.currentShifts}/{staffMember.targetShifts}
                        </Typography>
                        <Box 
                          sx={{ 
                            width: '100%', 
                            height: 6, 
                            bgcolor: 'grey.200', 
                            borderRadius: 1,
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Math.min(100, (staffMember.currentShifts / staffMember.targetShifts) * 100)}%`,
                              height: '100%',
                              bgcolor: statusInfo.color === 'success' ? 'success.main' : 
                                       statusInfo.color === 'warning' ? 'warning.main' : 'error.main',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Shift Details */}
                      {staffMember.shiftDetails.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            This Week's Shifts:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {staffMember.shiftDetails.slice(0, 3).map((shift, index) => (
                              <Chip
                                key={index}
                                label={`${format(parseISO(shift.day), 'EEE')} ${shift.arrivalTime || 'TBD'}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                            ))}
                            {staffMember.shiftDetails.length > 3 && (
                              <Chip
                                label={`+${staffMember.shiftDetails.length - 3}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.6rem', height: 18 }}
                              />
                            )}
                          </Box>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Summary Stats */}
        {workingStaff.length > 0 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Week Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {workingStaff.filter(s => s.targetGap === 0).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    On Target
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {workingStaff.filter(s => s.targetGap > 0).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Under Target
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main">
                    {workingStaff.filter(s => s.targetGap < 0).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Over Target
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

        {workingStaff.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No staff assignments found for this week.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default WorkingStaffDialog;
