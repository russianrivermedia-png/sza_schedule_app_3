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
} from '@mui/material';
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Today as TodayIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { format, startOfWeek, addDays } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ScheduleViewerTab() {
  const { staff, shifts, roles, tours, schedules, currentWeek } = useData();
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [weekSchedule, setWeekSchedule] = useState({});
  const scheduleRef = useRef(null);

  // Get week dates
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 });
  const weekDates = DAYS_OF_WEEK.map((_, index) => addDays(weekStart, index));

  // Load week schedule when week changes
  useEffect(() => {
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    const existingSchedule = schedules.find(s => s.weekKey === weekKey);
    if (existingSchedule) {
      setWeekSchedule(existingSchedule.days || {});
    } else {
      setWeekSchedule({});
    }
  }, [selectedWeek, schedules, weekStart]);

  const getShiftTours = (shift) => {
    if (!shift.tours || shift.tours.length === 0) return [];
    return shift.tours.map(tourId => tours.find(t => t.id === tourId)).filter(Boolean);
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
                        {shift.requiredRoles.map(roleId => {
                          const role = roles.find(r => r.id === roleId);
                          const assignedStaffId = shift.assignedStaff[roleId];
                          const assignedStaff = staff.find(s => s.id === assignedStaffId);
                          
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
                                      bgcolor: shift.staffColors?.[assignedStaffId] || '#9e9e9e',
                                      color: 'white',
                                      fontWeight: 'medium',
                                    }}
                                  />
                                </Tooltip>
                            </Box>
                          );
                        })}
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
                                bgcolor: shift.tourColors?.[tour.id] || 'transparent'
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
                    {shift.requiredRoles.map(roleId => {
                      const role = roles.find(r => r.id === roleId);
                      const assignedStaffId = shift.assignedStaff[roleId];
                      const assignedStaff = staff.find(s => s.id === assignedStaffId);
    
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
                                bgcolor: shift.staffColors?.[assignedStaffId] || '#9e9e9e',
                                color: 'white',
                                fontWeight: 'medium',
                              }}
                          />
                        </Tooltip>
                        </Box>
                      );
                    })}
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Schedule Viewer</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
            startIcon={<PdfIcon />}
            onClick={exportToPDF}
            sx={{ bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
            data-testid="export-pdf-button"
          >
            Export PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<NavigateBeforeIcon />}
            onClick={() => setSelectedWeek(prev => addDays(prev, -7))}
          >
            Previous Week
          </Button>
          <Button
            variant="outlined"
            startIcon={<TodayIcon />}
            onClick={() => setSelectedWeek(new Date())}
          >
            Current Week
          </Button>
          <Button
            variant="outlined"
            endIcon={<NavigateNextIcon />}
            onClick={() => setSelectedWeek(prev => addDays(prev, 7))}
          >
            Next Week
            </Button>
          </Box>
      </Box>

      <Typography variant="h6" sx={{ mb: 2 }}>
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
