import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  useMediaQuery,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Today as TodayIcon,
  PictureAsPdf as PdfIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { format, startOfWeek, addDays } from 'date-fns';
import { DEFAULT_TOUR_COLORS, getTourColorValue } from '../config/tourColors';
import { DEFAULT_STAFF_COLORS, getStaffColorValue } from '../config/staffColors';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


function ScheduleViewerTab() {
  const { staff, shifts, roles, tours, schedules, currentWeek, loading } = useData();
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [weekSchedule, setWeekSchedule] = useState({});
  const scheduleRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get week dates
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 });
  const weekDates = DAYS_OF_WEEK.map((_, index) => addDays(weekStart, index));

  // Load week schedule when week changes
  useEffect(() => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    console.log('🔍 ScheduleViewerTab - Available schedules:', schedules);
    console.log('🔍 ScheduleViewerTab - Looking for schedule with weekKey:', weekKey);
    const existingSchedule = schedules?.find(s => s.weekKey === weekKey);
    console.log('🔍 ScheduleViewerTab - Found schedule:', existingSchedule);
    if (existingSchedule) {
      console.log('🔍 ScheduleViewerTab - Found schedule data:', existingSchedule.days);
      setWeekSchedule(existingSchedule.days || {});
    } else {
      console.log('🔍 ScheduleViewerTab - No schedule found for week:', weekKey);
      setWeekSchedule({});
    }
  }, [selectedWeek, schedules]);

  // Don't render if data is still loading
  if (loading || !staff || !roles || !tours || !schedules) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading schedule data...</Typography>
      </Box>
    );
  }

  // Helper function to parse time from tour name for chronological sorting
  const parseTimeFromTourName = (tourName) => {
    // Match patterns like "9:00 AM", "2:30 PM", "12:15 PM", etc.
    const timeMatch = tourName.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) {
      console.log(`⚠️ ScheduleViewerTab - Could not parse time from tour name: "${tourName}"`);
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
    
    console.log(`🕐 ScheduleViewerTab - Parsed "${tourName}" -> ${totalMinutes} minutes (${hours}:${minutes} ${period})`);
    return totalMinutes;
  };

  const getShiftTours = (shift) => {
    console.log(`🔍 ScheduleViewerTab - getShiftTours for "${shift.name}":`, {
      shiftTours: shift.tours,
      toursLength: shift.tours?.length || 0,
      globalTours: tours?.length || 0
    });
    
    if (!shift.tours || shift.tours.length === 0 || !tours) {
      console.log(`❌ ScheduleViewerTab - No tours found for "${shift.name}"`);
      return [];
    }
    
    const foundTours = shift.tours.map(tourId => {
      const tour = tours.find(t => t.id === tourId);
      console.log(`🔍 ScheduleViewerTab - Looking for tour ${tourId}:`, tour ? tour.name : 'NOT FOUND');
      return tour;
    }).filter(Boolean);
    
    // Sort tours chronologically (earliest to latest)
    const sortedTours = foundTours.sort((a, b) => {
      const timeA = parseTimeFromTourName(a.name);
      const timeB = parseTimeFromTourName(b.name);
      console.log(`📊 ScheduleViewerTab - Comparing "${a.name}" (${timeA}) vs "${b.name}" (${timeB}) -> ${timeA - timeB}`);
      return timeA - timeB;
    });
    
    console.log(`✅ ScheduleViewerTab - Found ${sortedTours.length} tours for "${shift.name}":`, sortedTours.map(t => t.name));
    return sortedTours;
  };

  // Helper function to get staff color value
  const getStaffColor = (staffMember, shiftStaffColors, staffId) => {
    return getStaffColorValue(staffMember, shiftStaffColors, staffId);
  };

  // Helper function to get tour color value
  const getTourColor = (tour, shiftTourColors, tourId) => {
    return getTourColorValue(tour, shiftTourColors, tourId);
  };

  // Helper function to determine text color based on background color
  const getTourTextColor = (tour, shiftTourColors, tourId) => {
    const backgroundColor = getTourColor(tour, shiftTourColors, tourId);
    
    // Debug: Log tour color information
    console.log(`🎨 ScheduleViewerTab - Tour color debug:`, {
      tourId,
      tourName: tour?.name,
      tourDefaultColor: tour?.default_color,
      shiftTourColors,
      backgroundColor,
      colorKey: tour?.default_color
    });
    
    // Check if it's a light color that needs black text
    if (backgroundColor === '#ffeb3b' || backgroundColor === '#ffeb3b') { // yellow
      return '#000';
    }
    
    // For all other colors, use white text
    return '#fff';
  };

  const exportToPDF = () => {
    if (!scheduleRef.current) return;
    
    // Show loading state
    const exportButton = document.querySelector('[data-testid="export-pdf-button"]');
    if (exportButton) {
      exportButton.disabled = true;
      exportButton.textContent = 'Generating PDF...';
    }
    
    // Capture the schedule as an image
    html2canvas(scheduleRef.current, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: scheduleRef.current.scrollWidth,
      height: scheduleRef.current.scrollHeight,
    }).then(canvas => {
      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF with the image
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Add title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('SZA Schedule', 105, 20, { align: 'center' });
      
      // Add week info
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Week of ${format(weekStart, 'MMMM d, yyyy')}`, 105, 30, { align: 'center' });
      
      // Add the schedule image
      let heightLeft = imgHeight;
      let position = 40; // Start below title
      
      // Add first page
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - position;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save the PDF
      const fileName = `sza-schedule-${format(weekStart, 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      // Reset button state
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.textContent = 'Export PDF';
      }
    }).catch(error => {
      console.error('Error generating PDF:', error);
      // Reset button state on error
      if (exportButton) {
        exportButton.disabled = false;
        exportButton.textContent = 'Export PDF';
      }
    });
  };

  const renderScheduleTable = (day, dayIndex) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const daySchedule = weekSchedule[dayKey] || { shifts: [] };
    const dayOfWeek = DAYS_OF_WEEK[dayIndex];
    
    console.log('🔍 ScheduleViewerTab - Rendering day:', { dayKey, daySchedule, dayOfWeek });
    if (daySchedule.shifts && daySchedule.shifts.length > 0) {
        console.log('🔍 ScheduleViewerTab - Sample shift structure:', daySchedule.shifts[0]);
        console.log('🔍 ScheduleViewerTab - Sample shift tours:', daySchedule.shifts[0]?.tours);
    }

    if (daySchedule.shifts.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography color="text.secondary" variant="body2">
            No shifts scheduled
          </Typography>
        </Box>
      );
    }

    // Separate shifts with tours from those without
    const shiftsWithTours = daySchedule.shifts.filter(shift => 
      shift.tours && shift.tours.length > 0
    );
    const shiftsWithoutTours = daySchedule.shifts.filter(shift => 
      !shift.tours || shift.tours.length === 0
    );

    // Mobile layout - compact cards with 2 per row
    if (isMobile) {
      const allShifts = [...shiftsWithTours, ...shiftsWithoutTours];
      
      return (
        <Box>
          {/* Grid layout for mobile - 2 shifts per row */}
          <Grid container spacing={1}>
            {allShifts.map((shift) => {
              const shiftTours = getShiftTours(shift);
              const hasNotes = shift.notes && shift.notes.trim().length > 0;
              
              return (
                <Grid item xs={6} key={shift.id}>
                  <Card sx={{ 
                    p: 1.5, 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 120
                  }}>
                    <Stack spacing={1} sx={{ height: '100%' }}>
                      {/* Header with time and shift name */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                            {shift.arrivalTime || 'TBD'}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            fontWeight="medium" 
                            sx={{ 
                              fontSize: '0.7rem',
                              lineHeight: 1.2,
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {shift.name}
                          </Typography>
                        </Box>
                        {hasNotes && (
                          <Tooltip title={shift.notes} arrow placement="top">
                            <Typography 
                              variant="caption" 
                              color="primary" 
                              sx={{ 
                                cursor: 'pointer',
                                fontSize: '0.6rem',
                                ml: 0.5
                              }}
                            >
                              📝
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>

                      {/* Staff assignments - compact */}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                          {(() => {
                            const roleIds = shift.requiredRoles || (shift.assignedStaff ? Object.keys(shift.assignedStaff) : []);
                            return roleIds.slice(0, 4).map(roleId => { // Limit to 4 staff per shift for space
                              const role = roles?.find(r => r.id === roleId);
                              const assignedStaffId = shift.assignedStaff?.[roleId];
                              const assignedStaff = staff?.find(s => s.id === assignedStaffId);
                              
                              return (
                                <Tooltip key={roleId} title={`${role?.name || 'Unknown Role'}: ${assignedStaff ? assignedStaff.name : 'Unassigned'}`} arrow placement="top">
                                  <Chip
                                    label={assignedStaff ? assignedStaff.name.split(' ')[0] : '?'}
                                    size="small"
                                    variant="filled"
                                    sx={{
                                      fontSize: '0.6rem',
                                      height: 16,
                                      minWidth: 20,
                                      bgcolor: getStaffColor(assignedStaff, shift.staffColors, assignedStaffId),
                                      color: 'white',
                                      fontWeight: 'medium',
                                    }}
                                  />
                                </Tooltip>
                              );
                            });
                          })()}
                          {(() => {
                            const roleIds = shift.requiredRoles || (shift.assignedStaff ? Object.keys(shift.assignedStaff) : []);
                            if (roleIds.length > 4) {
                              return (
                                <Chip
                                  label={`+${roleIds.length - 4}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontSize: '0.6rem',
                                    height: 16,
                                    minWidth: 20,
                                  }}
                                />
                              );
                            }
                            return null;
                          })()}
                        </Box>
                      </Box>

                      {/* Tours - compact */}
                      {shiftTours.length > 0 && (
                        <Box>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                            {shiftTours.slice(0, 3).map(tour => ( // Limit to 3 tours for space
                              <Chip
                                key={tour.id}
                                label={tour.name}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  fontSize: '0.6rem', 
                                  height: 16,
                                  bgcolor: getTourColor(tour, shift.tourColors, tour.id),
                                  color: getTourTextColor(tour, shift.tourColors, tour.id)
                                }}
                              />
                            ))}
                            {shiftTours.length > 3 && (
                              <Chip
                                label={`+${shiftTours.length - 3}`}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontSize: '0.6rem',
                                  height: 16,
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      )}
                    </Stack>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      );
    }

    // Desktop layout - use table format
    return (
      <Box>
        {/* Tour-based shifts in table format */}
        {shiftsWithTours.length > 0 && (
          <TableContainer component={Paper} sx={{ mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
                  <TableCell width="15%">Time</TableCell>
                  <TableCell width="20%">Shift</TableCell>
                  <TableCell width="35%">Staff</TableCell>
                  <TableCell width="20%">Tours</TableCell>
                  <TableCell width="10%">Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
                {shiftsWithTours.map((shift) => {
                const shiftTours = getShiftTours(shift);
                const hasNotes = shift.notes && shift.notes.trim().length > 0;
                
                console.log('🔍 ScheduleViewerTab - Rendering shift:', { 
                  shiftId: shift.id, 
                  shiftName: shift.name, 
                  assignedStaff: shift.assignedStaff,
                  requiredRoles: shift.requiredRoles,
                  fullShiftData: shift
                });
                
                // Debug: Log the actual assignedStaff structure
                if (shift.assignedStaff) {
                  console.log('🔍 ScheduleViewerTab - assignedStaff structure:', shift.assignedStaff);
                  console.log('🔍 ScheduleViewerTab - assignedStaff keys:', Object.keys(shift.assignedStaff));
                }

                return (
                    <TableRow key={shift.id}>
                    <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {shift.arrivalTime || 'TBD'}
                        </Typography>
                    </TableCell>
                    <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                        {shift.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {/* If requiredRoles is defined, use it; otherwise derive from assignedStaff keys */}
                        {(() => {
                          const roleIds = shift.requiredRoles || (shift.assignedStaff ? Object.keys(shift.assignedStaff) : []);
                          return roleIds.map(roleId => {
                            const role = roles?.find(r => r.id === roleId);
                            const assignedStaffId = shift.assignedStaff?.[roleId];
                            const assignedStaff = staff?.find(s => s.id === assignedStaffId);
                            
                            return (
                                <Box key={roleId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Tooltip title={role?.name || 'Unknown Role'} arrow placement="top">
                                <Chip
                                      label={assignedStaff ? assignedStaff.name.split(' ')[0] : 'Unassigned'}
                                  size="small"
                                      variant="filled"
                                      sx={{
                                        fontSize: '0.7rem',
                                        height: 20,
                                        bgcolor: getStaffColor(assignedStaff, shift.staffColors, assignedStaffId),
                                        color: 'white',
                                        fontWeight: 'medium',
                                      }}
                                    />
                                  </Tooltip>
                              </Box>
                            );
                          });
                        })()}
                      </Box>
                    </TableCell>
                    <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {shiftTours.map(tour => (
                            <Chip
                              key={tour.id}
                              label={tour.name}
                        size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: '0.7rem', 
                                height: 20,
                                bgcolor: getTourColor(tour, shift.tourColors, tour.id),
                                color: getTourTextColor(tour, shift.tourColors, tour.id)
                              }}
                            />
                          ))}
                        </Box>
                    </TableCell>
                    <TableCell>
                      {hasNotes && (
                          <Tooltip title={shift.notes} arrow placement="top">
                            <Typography 
                              variant="caption" 
                              color="primary" 
                              sx={{ 
                                cursor: 'pointer',
                                fontWeight: 'medium',
                                textDecoration: 'underline'
                              }}
                            >
                              📝
                            </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
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
              {shiftsWithoutTours.map((shift) => (
                <Box
                  key={shift.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1.5,
                    minWidth: 200,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {shift.arrivalTime || 'TBD'}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {shift.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {/* If requiredRoles is defined, use it; otherwise derive from assignedStaff keys */}
                    {(() => {
                      const roleIds = shift.requiredRoles || (shift.assignedStaff ? Object.keys(shift.assignedStaff) : []);
                      return roleIds.map(roleId => {
                        const role = roles?.find(r => r.id === roleId);
                        const assignedStaffId = shift.assignedStaff?.[roleId];
                        const assignedStaff = staff?.find(s => s.id === assignedStaffId);
      
      return (
                          <Box key={roleId} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={role?.name || 'Unknown Role'} arrow placement="top">
                      <Chip
                                label={assignedStaff ? assignedStaff.name.split(' ')[0] : 'Unassigned'}
                        size="small"
                                variant="filled"
                                sx={{
                                  fontSize: '0.7rem',
                                  height: 20,
                                  bgcolor: getStaffColor(assignedStaff, shift.staffColors, assignedStaffId),
                                  color: 'white',
                                  fontWeight: 'medium',
                                }}
                            />
                          </Tooltip>
                          </Box>
                        );
                      });
                    })()}
                  </Box>
                  
                  {/* Notes indicator for non-tour shifts */}
                  {shift.notes && shift.notes.trim().length > 0 && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Tooltip title={shift.notes} arrow placement="top">
                        <Typography 
                          variant="caption" 
                          color="primary" 
                          sx={{ 
                            cursor: 'pointer',
                            fontWeight: 'medium',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          📝 <span style={{ textDecoration: 'underline' }}>Has notes</span>
                        </Typography>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
                      ))}
                    </Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Header - responsive layout */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        mb: 3,
        gap: isMobile ? 2 : 0
      }}>
        <Typography variant={isMobile ? "h5" : "h4"}>
          {isMobile ? "Schedule" : "Schedule Viewer"}
        </Typography>
        
        {/* Navigation buttons - responsive layout */}
        <Box sx={{ 
          display: 'flex', 
          gap: isMobile ? 1 : 2,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          justifyContent: isMobile ? 'center' : 'flex-end'
        }}>
          {!isMobile && (
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={exportToPDF}
              sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
              data-testid="export-pdf-button"
            >
              Export PDF
            </Button>
          )}
          
          <Button
            variant="outlined"
            startIcon={<NavigateBeforeIcon />}
            onClick={() => setSelectedWeek(prev => addDays(prev, -7))}
            size={isMobile ? "small" : "medium"}
            sx={{ minWidth: isMobile ? 'auto' : 'auto' }}
          >
            {isMobile ? "Prev" : "Previous Week"}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<TodayIcon />}
            onClick={() => setSelectedWeek(new Date())}
            size={isMobile ? "small" : "medium"}
            sx={{ minWidth: isMobile ? 'auto' : 'auto' }}
          >
            {isMobile ? "Today" : "Current Week"}
          </Button>
          
          <Button
            variant="outlined"
            endIcon={<NavigateNextIcon />}
            onClick={() => setSelectedWeek(prev => addDays(prev, 7))}
            size={isMobile ? "small" : "medium"}
            sx={{ minWidth: isMobile ? 'auto' : 'auto' }}
          >
            {isMobile ? "Next" : "Next Week"}
          </Button>
          
          {isMobile && (
            <Button
              variant="contained"
              startIcon={<PdfIcon />}
              onClick={exportToPDF}
              sx={{ 
                bgcolor: '#d32f2f', 
                '&:hover': { bgcolor: '#b71c1c' },
                width: '100%',
                mt: 1
              }}
              data-testid="export-pdf-button"
            >
              Export PDF
            </Button>
          )}
        </Box>
      </Box>

      <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ mb: 2, textAlign: isMobile ? 'center' : 'left' }}>
        Week of {format(weekStart, 'MMMM d, yyyy')}
      </Typography>

      <Box ref={scheduleRef}>
        <Grid container spacing={2}>
          {weekDates.map((day, dayIndex) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const daySchedule = weekSchedule[dayKey] || { shifts: [] };
            const dayOfWeek = DAYS_OF_WEEK[dayIndex];
            
            return (
              <Grid item xs={12} key={dayKey}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                      {dayOfWeek} - {format(day, 'MMM d')}
                    </Typography>
                    {renderScheduleTable(day, dayIndex)}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        </Box>
    </Box>
  );
}

export default ScheduleViewerTab;
