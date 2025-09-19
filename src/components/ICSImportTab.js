import React, { useState, useCallback, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useData } from '../context/DataContext';

const ICSImportTab = () => {
  const { schedules, addSchedule, updateSchedule } = useData();
  
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [parsedBookings, setParsedBookings] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: new Date(),
    end: new Date()
  });
  const [icsUrl, setIcsUrl] = useState('http://peeklabs-calendar-connect.web.app/api/ics/9a65d3be-6f15-494a-b3eb-09de28d2ac6e/kze2j1x2uc');
  const [importResults, setImportResults] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Tour type mapping with course information
  const tourTypeMapping = {
    'Tree Tops Zipline Tour': {
      shiftName: 'Tree Tops Zipline Tour',
      course: 'Tree Tops',
      roles: ['Lead Guide', 'Sweep Guide'],
      duration: 2.5,
      maxToursPerGuide: 3,
      color: '#2196f3',
      isNightTour: false
    },
    'Forest Flight Zipline Tour': {
      shiftName: 'Forest Flight Zipline Tour',
      course: 'Forest Flight',
      roles: ['Lead Guide', 'Sweep Guide'],
      duration: 2.5,
      maxToursPerGuide: 3,
      color: '#ff9800',
      isNightTour: false
    },
    'Night Flights Zipline Tours': {
      shiftName: 'Night Flights Zipline Tours',
      course: 'Night Flights',
      roles: ['Lead Guide', 'Sweep Guide'],
      duration: 2.5,
      maxToursPerGuide: 3,
      color: '#9c27b0',
      isNightTour: true
    },
    'Tree Tops Zipline Tour - Treehouse Options': {
      shiftName: 'Tree Tops Zipline Tour - Treehouse Options',
      course: 'Tree Tops',
      roles: ['Lead Guide', 'Sweep Guide'],
      duration: 2.5,
      maxToursPerGuide: 3,
      color: '#2196f3',
      isNightTour: false
    },
    'Forest Flight Zipline Tour - Treehouse Options': {
      shiftName: 'Forest Flight Zipline Tour - Treehouse Options',
      course: 'Forest Flight',
      roles: ['Lead Guide', 'Sweep Guide'],
      duration: 2.5,
      maxToursPerGuide: 3,
      color: '#ff9800',
      isNightTour: false
    }
  };

  // ICS Calendar Feed Processing
  const handleICSImport = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Use CORS proxy to bypass CORS restrictions
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(icsUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch calendar: ${response.status}`);
      }
      
      const icsText = await response.text();
      console.log('Raw ICS data (first 2000 chars):', icsText.substring(0, 2000));
      console.log('Total ICS data length:', icsText.length);
      
      const bookings = parseICSData(icsText);
      
      console.log(`Parsed ${bookings.length} tours with confirmed guests from ICS feed`);
      
      // Show summary of what was imported
      const tourTypes = {};
      bookings.forEach(booking => {
        const tourType = getTourTypeFromProduct(booking.product);
        if (!tourTypes[tourType]) {
          tourTypes[tourType] = { count: 0, guests: 0 };
        }
        tourTypes[tourType].count++;
        tourTypes[tourType].guests += booking.guestCount;
      });
      
      console.log('Import Summary:', tourTypes);
      
      // Group by date to set date range
      const dates = [...new Set(bookings.map(booking => booking.date))].sort();
      
      console.log(`Found ${dates.length} unique dates:`, dates);
      console.log(`Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
      
      setParsedBookings(bookings);
      setSelectedDateRange({
        start: dates.length > 0 ? new Date(dates[0]) : new Date(),
        end: dates.length > 1 ? new Date(dates[dates.length - 1]) : new Date()
      });
      
    } catch (error) {
      console.error('Error fetching ICS calendar:', error);
      setError('Error fetching calendar data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [icsUrl]);

  // Parse ICS data to extract tour information
  const parseICSData = (icsText) => {
    const bookings = [];
    const lines = icsText.split('\n');
    
    let currentEvent = {};
    let inEvent = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
        inEvent = true;
      } else if (line === 'END:VEVENT' && inEvent) {
        // Process the completed event
        if (currentEvent.summary && currentEvent.dtstart && currentEvent.description) {
          console.log('Processing event:', currentEvent.summary, currentEvent.dtstart);
          const booking = parseEventToBooking(currentEvent);
          if (booking) {
            console.log('Added booking:', booking);
            bookings.push(booking);
          } else {
            console.log('Filtered out event:', currentEvent.summary);
          }
        } else {
          console.log('Skipping incomplete event:', currentEvent);
        }
        inEvent = false;
      } else if (inEvent) {
        // Parse event properties
        if (line.startsWith('SUMMARY:')) {
          currentEvent.summary = line.substring(8);
        } else if (line.startsWith('DTSTART:')) {
          currentEvent.dtstart = line.substring(8);
        } else if (line.startsWith('DTEND:')) {
          currentEvent.dtend = line.substring(6);
        } else if (line.startsWith('DESCRIPTION:')) {
          currentEvent.description = line.substring(12);
        }
      }
    }
    
    return bookings;
  };

  // Convert ICS event to booking format
  const parseEventToBooking = (event) => {
    // Skip treehouse adventures (overnight stays)
    if (event.summary.includes('Treehouse Adventures') && !event.summary.includes('Zipline Tour')) {
      return null;
    }
    
    // Extract guest count from description FIRST
    const guestCount = extractGuestCount(event.description);
    
    // ONLY import tours with confirmed guests (guestCount > 0)
    if (guestCount === 0) {
      // console.log(`Skipping tour with no guests: ${event.summary}`);
      return null;
    }
    
    // Parse date from DTSTART (format: 20250917T170000Z)
    const dtstart = event.dtstart;
    // console.log(`Raw DTSTART: ${dtstart}`);
    
    const year = dtstart.substring(0, 4);
    const month = dtstart.substring(4, 6);
    const day = dtstart.substring(6, 8);
    const hour = dtstart.substring(9, 11);
    const minute = dtstart.substring(11, 13);
    
    // console.log(`Parsed date: ${year}-${month}-${day} at ${hour}:${minute}`);
    
    const eventDate = new Date(`${year}-${month}-${day}`);
    const eventTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    
    // Convert to local time and format
    const localTime = new Date(eventTime.getTime() - (eventTime.getTimezoneOffset() * 60000));
    const timeString = localTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    // console.log(`Final date string: ${year}-${month}-${day}, time: ${timeString}`);
    
    // Determine tour type
    let productName = event.summary;
    if (event.summary.includes('Treehouse Options')) {
      // Extract the zipline tour part
      if (event.summary.includes('Tree Tops')) {
        productName = 'Tree Tops Zipline Tour - Treehouse Options';
      } else if (event.summary.includes('Forest Flight')) {
        productName = 'Forest Flight Zipline Tour - Treehouse Options';
      }
    }
    
    // console.log(`Importing tour with ${guestCount} confirmed guests: ${productName} at ${timeString}`);
    
    return {
      time: timeString,
      product: productName,
      guestCount: guestCount,
      date: `${year}-${month}-${day}`
    };
  };

  // Extract guest count from description
  const extractGuestCount = (description) => {
    if (!description) {
      console.log('No description found for event');
      return 0;
    }
    
    // Look for patterns like "2x Guest(s)" or "B-XXXXXXX\n2x Guest(s)"
    // Handle cases where "Guest(s)" is split across lines like "Guest(\ns)"
    // First normalize the description by removing line breaks within words
    const normalizedDescription = description.replace(/\n/g, ' ');
    const guestMatches = normalizedDescription.match(/(\d+)x\s*Guest\(s\)/g);
    if (guestMatches) {
      const totalGuests = guestMatches.reduce((total, match) => {
        const count = parseInt(match.match(/(\d+)/)[1]);
        return total + count;
      }, 0);
      console.log(`Found ${totalGuests} guests in description: ${description.substring(0, 100)}...`);
      return totalGuests;
    }
    
    console.log(`No guest count found in description: ${description.substring(0, 100)}...`);
    return 0;
  };

  // Get tour type from product name
  const getTourTypeFromProduct = (product) => {
    if (product.includes('Tree Tops Zipline Tour')) return 'Tree Tops Zipline Tour';
    if (product.includes('Forest Flight Zipline Tour')) return 'Forest Flight Zipline Tour';
    if (product.includes('Night Flights Zipline Tours')) return 'Night Flights Zipline Tours';
    return 'Unknown';
  };

  // Process bookings and create shifts
  const processBookings = useCallback(() => {
    if (!parsedBookings || parsedBookings.length === 0) return;

    const allShifts = [];
    
    // Group bookings by date
    const bookingsByDate = {};
    parsedBookings.forEach(booking => {
      if (!bookingsByDate[booking.date]) {
        bookingsByDate[booking.date] = [];
      }
      bookingsByDate[booking.date].push(booking);
    });

    // Create shifts for each date
    Object.entries(bookingsByDate).forEach(([date, dayBookings]) => {
      const shifts = createShiftsForDay(dayBookings, date);
      allShifts.push(...shifts);
    });

    // Store in localStorage for the main builder to pick up
    localStorage.setItem('csvShiftsImported', JSON.stringify({
      shifts: allShifts,
      dateRange: selectedDateRange,
      timestamp: new Date().toISOString()
    }));

    // Dispatch event to notify main builder
    window.dispatchEvent(new CustomEvent('csvShiftsImported', {
      detail: { shifts: allShifts, dateRange: selectedDateRange }
    }));

    setImportResults({
      totalShifts: allShifts.length,
      totalTours: parsedBookings.length,
      totalGuests: parsedBookings.reduce((sum, booking) => sum + booking.guestCount, 0),
      shifts: allShifts
    });

    console.log(`Created ${allShifts.length} shifts from ${parsedBookings.length} bookings`);
  }, [parsedBookings, selectedDateRange]);

  // Create shifts for a single day
  const createShiftsForDay = (dayBookings, date) => {
    const shifts = [];
    
    // Group tours by course
    const courseGroups = {
      'Tree Tops': [],
      'Forest Flight': [],
      'Night Flights': []
    };

    // Group bookings by course
    dayBookings.forEach(booking => {
      const tourType = getTourTypeFromProduct(booking.product);
      const config = tourTypeMapping[tourType];
      if (config) {
        courseGroups[config.course].push({
          ...booking,
          tourType,
          config
        });
      } else {
        console.log(`Unknown tour type: ${tourType} for product: ${booking.product}`);
      }
    });

    console.log('Course groups:', courseGroups);

    // Create shifts for each course
    Object.entries(courseGroups).forEach(([course, tours]) => {
      if (tours.length === 0) return;

      // Sort tours by time
      tours.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

      console.log(`Creating shifts for ${course} with ${tours.length} tours:`, tours.map(t => t.time));

      // Create guiding shifts (grouped by 3-hour spacing)
      const guidingShifts = createGuidingShifts(tours, course);
      shifts.push(...guidingShifts);

      // Create other role shifts
      // Only create guiding shifts for now
    });

    return shifts;
  };

  // Create guiding shifts with 3-hour spacing
  const createGuidingShifts = (tours, course) => {
    const shifts = [];
    let currentShiftTours = [];
    let lastTourTime = null;

    for (let i = 0; i < tours.length; i++) {
      const tour = tours[i];
      
      console.log(`Processing tour ${i + 1}/${tours.length}: ${tour.time}`);
      console.log(`Current shift has ${currentShiftTours.length} tours, last tour: ${lastTourTime}`);
      
      // Check if this tour can be added to current shift
      if (currentShiftTours.length === 0 || 
          (lastTourTime && isThreeHoursApart(lastTourTime, tour.time) && currentShiftTours.length < 3)) {
        
        console.log(`Adding ${tour.time} to current shift`);
        currentShiftTours.push(tour);
        lastTourTime = tour.time;
        
        // If we have 3 tours or this is the last tour, create a shift
        if (currentShiftTours.length === 3 || i === tours.length - 1) {
          const shift = createShiftFromTours(currentShiftTours, course);
          shifts.push(shift);
          console.log(`Created shift with tours:`, currentShiftTours.map(t => t.time));
          
          // Reset for next shift
          currentShiftTours = [];
          lastTourTime = null;
        }
      } else {
        // Create shift with current tours and start new shift
        console.log(`Cannot add ${tour.time} to current shift - creating new shift`);
        if (currentShiftTours.length > 0) {
          const shift = createShiftFromTours(currentShiftTours, course);
          shifts.push(shift);
          console.log(`Created shift with tours:`, currentShiftTours.map(t => t.time));
        }
        
        console.log(`Starting new shift with ${tour.time}`);
        currentShiftTours = [tour];
        lastTourTime = tour.time;
      }
    }

    console.log(`Created ${shifts.length} shifts for ${course}`);
    return shifts;
  };

  // Create shift from tours
  const createShiftFromTours = (tours, course) => {
    const firstTour = tours[0];
    const lastTour = tours[tours.length - 1];
    
    // Calculate arrival time (15 minutes before first tour)
    const arrivalTime = calculateArrivalTime(firstTour.time);
    
    // Assign roles
    const roles = assignRolesForGuidingShift(tours.length);
    
    return {
      id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${course} Guiding`,
      course: course,
      date: firstTour.date, // Add the date from the first tour
      tours: tours.map(tour => ({
        time: tour.time,
        product: tour.product,
        guestCount: tour.guestCount,
        tourType: tour.tourType,
        date: tour.date // Also include date in each tour
      })),
      startTime: firstTour.time,
      endTime: lastTour.time,
      arrivalTime: arrivalTime,
      tourCount: tours.length,
      totalGuests: tours.reduce((sum, tour) => sum + tour.guestCount, 0),
      roles: roles,
      assignedStaff: {}, // Empty initially, to be filled by builder
      duration: 2.5 * tours.length, // 2.5 hours per tour
      color: tourTypeMapping[firstTour.tourType]?.color || '#2196f3',
      isNightTour: tourTypeMapping[firstTour.tourType]?.isNightTour || false,
      // For builder compatibility
      requiredRoles: roles,
      staffColors: {},
      tourColors: {},
      notes: `Imported from ICS - ${tours.length} tours`
    };
  };


  // Helper functions
  const timeToMinutes = (timeStr) => {
    const [time, period] = timeStr.toLowerCase().split(/(am|pm)/);
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;
    if (period === 'pm' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'am' && hours === 12) totalMinutes -= 12 * 60;
    return totalMinutes;
  };

  const isThreeHoursApart = (time1, time2) => {
    const minutes1 = timeToMinutes(time1);
    const minutes2 = timeToMinutes(time2);
    const diff = Math.abs(minutes2 - minutes1);
    console.log(`Checking if ${time1} and ${time2} are 3+ hours apart: ${diff} minutes (${diff >= 180 ? 'YES' : 'NO'})`);
    return diff >= 180; // 3 hours = 180 minutes
  };

  const calculateArrivalTime = (tourTime) => {
    const minutes = timeToMinutes(tourTime);
    const arrivalMinutes = minutes - 15; // 15 minutes before
    
    const hours = Math.floor(arrivalMinutes / 60);
    const mins = arrivalMinutes % 60;
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    
    return `${displayHours}:${mins.toString().padStart(2, '0')}${period}`;
  };

  const assignRolesForGuidingShift = (tourCount) => {
    const roles = ['Lead Guide']; // Always need at least one Lead
    if (tourCount > 1) {
      roles.push('Sweep Guide');
    }
    return roles;
  };

  // Auto-process when bookings change
  useEffect(() => {
    if (parsedBookings.length > 0) {
      processBookings();
    }
  }, [parsedBookings, processBookings]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Schedule Import from ICS Calendar
        </Typography>
        
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import from Calendar Feed
            </Typography>
            
            <TextField
              fullWidth
              label="ICS Calendar URL"
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Enter the URL of your booking software's ICS calendar feed"
            />
            
            <Button
              variant="contained"
              onClick={handleICSImport}
              disabled={isProcessing}
              startIcon={isProcessing ? <CircularProgress size={20} /> : null}
              sx={{ mb: 2 }}
            >
              {isProcessing ? 'Fetching Calendar...' : 'Import from Calendar'}
            </Button>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            
            {importResults && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Import Results
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Chip 
                      label={`${importResults.totalShifts} Shifts Generated`} 
                      color="primary" 
                      variant="outlined" 
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Chip 
                      label={`${importResults.totalTours} Total Tours`} 
                      color="secondary" 
                      variant="outlined" 
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Chip 
                      label={`${importResults.totalGuests} Total Guests`} 
                      color="success" 
                      variant="outlined" 
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {parsedBookings.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generated Shifts by Date
              </Typography>
              
              {importResults?.shifts && (() => {
                // Group shifts by date
                const shiftsByDate = importResults.shifts.reduce((acc, shift) => {
                  const date = shift.date || 'Unknown';
                  if (!acc[date]) {
                    acc[date] = [];
                  }
                  acc[date].push(shift);
                  return acc;
                }, {});

                // Sort dates
                const sortedDates = Object.keys(shiftsByDate).sort();

                return (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sortedDates.map(date => (
                      <Card key={date} variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="primary">
                            {new Date(date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {shiftsByDate[date].map((shift, index) => (
                              <Card key={shift.id || index} variant="outlined" sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                  <Box sx={{ minWidth: 120 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                      {shift.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Arrival: {shift.arrivalTime}
                                    </Typography>
                                  </Box>
                                  
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1 }}>
                                    {shift.tours.map((tour, tourIndex) => (
                                      <Chip
                                        key={tourIndex}
                                        label={`${tour.time} (${tour.guestCount} guests)`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                      />
                                    ))}
                                  </Box>
                                  
                                  <Box sx={{ display: 'flex', gap: 1, minWidth: 200 }}>
                                    <TextField
                                      size="small"
                                      placeholder="Lead Guide"
                                      sx={{ minWidth: 100 }}
                                      // Handle lead guide selection
                                    />
                                    {shift.roles.includes('Sweep Guide') && (
                                      <TextField
                                        size="small"
                                        placeholder="Sweep Guide"
                                        sx={{ minWidth: 100 }}
                                        // Handle sweep guide selection
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </Card>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default ICSImportTab;
