import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Upload as UploadIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { format, parseISO } from 'date-fns';

function CSVImportTab() {
  const { shifts, roles, tours, dispatch } = useData();
  const [csvData, setCsvData] = useState(null);
  const [parsedBookings, setParsedBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // Tour type mapping from CSV to your shift templates
  const tourTypeMapping = {
    'Treehouse Adventures': {
      shiftName: 'Treehouse Adventures',
      timeSlot: '12:30pm',
      roles: ['Lead Guide', 'Sweep Guide'], // 2 guides per tour
      duration: 2.5, // 2.5 hours per tour
      maxToursPerGuide: 3 // Max 3 tours per guide per shift
    },
    'Tree Tops Zipline Tour': {
      shiftName: 'Tree Tops Zipline Tour',
      timeSlot: '9:15am', // Will be updated based on actual time
      roles: ['Lead Guide', 'Sweep Guide'], // 2 guides per tour
      duration: 2.5, // 2.5 hours per tour
      maxToursPerGuide: 3 // Max 3 tours per guide per shift
    },
    'Forest Flight Zipline Tour': {
      shiftName: 'Forest Flight Zipline Tour',
      timeSlot: '10:00am', // Will be updated based on actual time
      roles: ['Lead Guide', 'Sweep Guide'], // 2 guides per tour
      duration: 2.5, // 2.5 hours per tour
      maxToursPerGuide: 3 // Max 3 tours per guide per shift
    },
    'Night Flights Zipline Tours': {
      shiftName: 'Night Flights Zipline Tours',
      timeSlot: '7:00pm', // Will be updated based on actual time
      roles: ['Lead Guide', 'Sweep Guide'], // 2 guides per tour
      duration: 2.5, // 2.5 hours per tour
      maxToursPerGuide: 3 // Max 3 tours per guide per shift
    }
  };

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target.result;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        // Find the Start Time column index
        const timeIndex = headers.findIndex(h => h.toLowerCase().includes('start time'));
        const productIndex = headers.findIndex(h => h.toLowerCase().includes('product name'));
        const guestIndex = headers.findIndex(h => h.toLowerCase().includes('# guests'));
        const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name'));
        
        if (timeIndex === -1 || productIndex === -1 || guestIndex === -1) {
          alert('CSV file must contain "Start Time", "Product Name", and "# Guests" columns');
          return;
        }

        const bookings = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const columns = line.split(',').map(c => c.replace(/"/g, '').trim());
          const time = columns[timeIndex];
          const product = columns[productIndex];
          const guestCount = parseInt(columns[guestIndex]) || 0;
          const customerName = columns[nameIndex] || 'Unknown';
          
          if (time && product && guestCount > 0) {
            bookings.push({
              time,
              product,
              guestCount,
              customerName,
              rawLine: line
            });
          }
        }
        
        setCsvData({ file, bookings, headers });
        setParsedBookings(bookings);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  }, []);

  const processBookings = useCallback(() => {
    if (!parsedBookings.length || !selectedDate) return;

    setIsProcessing(true);
    
    try {
      // Group bookings by time slot and tour type
      const groupedBookings = {};
      
      parsedBookings.forEach(booking => {
        const timeKey = booking.time;
        const tourType = getTourTypeFromProduct(booking.product);
        
        if (!groupedBookings[timeKey]) {
          groupedBookings[timeKey] = {};
        }
        
        if (!groupedBookings[timeKey][tourType]) {
          groupedBookings[timeKey][tourType] = {
            tourCount: 0, // Count tours, not guests
            totalGuests: 0, // Keep for reference
            bookings: [],
            tourConfig: tourTypeMapping[tourType]
          };
        }
        
        // Each booking represents 1 tour, regardless of guest count
        groupedBookings[timeKey][tourType].tourCount += 1;
        groupedBookings[timeKey][tourType].totalGuests += booking.guestCount; // Keep for reference
        groupedBookings[timeKey][tourType].bookings.push(booking);
      });

      // Generate shifts for each time slot
      const generatedShifts = [];
      Object.entries(groupedBookings).forEach(([timeSlot, tourTypes]) => {
        Object.entries(tourTypes).forEach(([tourType, data]) => {
          const config = data.tourConfig;
          if (!config) return;

          // Calculate required staff: 2 guides per tour
          const requiredStaff = data.tourCount * 2; // 2 guides per tour
          const toursPerGuide = Math.ceil(data.tourCount / Math.ceil(requiredStaff / 2)); // Tours per guide
          
          // Find matching shift template
          const shiftTemplate = shifts.find(s => 
            s.name.toLowerCase().includes(tourType.toLowerCase()) ||
            s.name.toLowerCase().includes(config.shiftName.toLowerCase())
          );

          if (shiftTemplate) {
            generatedShifts.push({
              timeSlot,
              tourType,
              shiftTemplate,
              tourCount: data.tourCount,
              totalGuests: data.totalGuests, // Keep for reference
              requiredStaff,
              toursPerGuide,
              duration: config.duration,
              bookings: data.bookings,
              roles: config.roles,
              date: selectedDate
            });
          }
        });
      });

      setImportResults({
        generatedShifts,
        totalBookings: parsedBookings.length,
        totalTours: generatedShifts.reduce((sum, s) => sum + s.tourCount, 0),
        totalGuests: parsedBookings.reduce((sum, b) => sum + b.guestCount, 0),
        date: selectedDate
      });
      
    } catch (error) {
      console.error('Error processing bookings:', error);
      alert('Error processing bookings. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [parsedBookings, selectedDate, shifts]);

  const getTourTypeFromProduct = (product) => {
    if (product.includes('Treehouse Adventures')) return 'Treehouse Adventures';
    if (product.includes('Tree Tops Zipline Tour')) return 'Tree Tops Zipline Tour';
    if (product.includes('Forest Flight Zipline Tour')) return 'Forest Flight Zipline Tour';
    if (product.includes('Night Flights Zipline Tours')) return 'Night Flights Zipline Tours';
    return 'Unknown';
  };

  const handleImportToSchedule = async () => {
    if (!importResults) return;

    try {
      // Store the CSV data in localStorage for the schedule builder to pick up
      const csvData = {
        bookings: parsedBookings,
        targetDate: importResults.date,
        generatedShifts: importResults.generatedShifts,
        timestamp: Date.now()
      };
      
      localStorage.setItem('csvImportData', JSON.stringify(csvData));
      
      // Trigger a custom event to notify the schedule builder
      window.dispatchEvent(new CustomEvent('csvImportReady', { 
        detail: csvData 
      }));
      
      alert(`CSV data prepared for import! Navigate to the Schedule Builder to complete the import.`);
      
      // Optionally redirect to the builder
      if (window.confirm('Would you like to go to the Schedule Builder now?')) {
        window.location.href = '/builder';
      }
      
    } catch (error) {
      console.error('Error importing to schedule:', error);
      alert('Error importing to schedule. Please try again.');
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        CSV Import - Booking Data
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Upload CSV files from your booking software to automatically generate shifts for your schedule.
      </Typography>

      {/* File Upload Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload CSV File
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <input
              accept=".csv"
              style={{ display: 'none' }}
              id="csv-upload"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="csv-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                sx={{ mr: 2 }}
              >
                Choose CSV File
              </Button>
            </label>
            
            {csvData && (
              <Chip
                label={`${csvData.bookings.length} bookings loaded`}
                color="success"
                icon={<CheckCircleIcon />}
              />
            )}
          </Box>

          {csvData && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>File:</strong> {csvData.file.name}<br/>
                <strong>Bookings found:</strong> {csvData.bookings.length}<br/>
                <strong>Total guests:</strong> {csvData.bookings.reduce((sum, b) => sum + b.guestCount, 0)}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Date Selection */}
      {csvData && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Select Date for Import
            </Typography>
            
            <TextField
              fullWidth
              label="Import Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            
            <Button
              variant="contained"
              onClick={processBookings}
              disabled={!selectedDate || isProcessing}
              startIcon={<UploadIcon />}
            >
              {isProcessing ? 'Processing...' : 'Process Bookings'}
            </Button>
            
            {isProcessing && <LinearProgress sx={{ mt: 2 }} />}
          </CardContent>
        </Card>
      )}

      {/* Processing Results */}
      {importResults && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import Results
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary.contrastText">
                    {importResults.generatedShifts.length}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    Shifts Generated
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="success.contrastText">
                    {importResults.totalTours}
                  </Typography>
                  <Typography variant="body2" color="success.contrastText">
                    Total Tours
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="info.contrastText">
                    {importResults.totalBookings}
                  </Typography>
                  <Typography variant="body2" color="info.contrastText">
                    Total Bookings
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="warning.contrastText">
                    {importResults.totalGuests}
                  </Typography>
                  <Typography variant="body2" color="warning.contrastText">
                    Total Guests
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Button
              variant="contained"
              color="success"
              onClick={handleImportToSchedule}
              startIcon={<CheckCircleIcon />}
              size="large"
            >
              Import to Schedule Builder
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detailed Results */}
      {importResults && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generated Shifts Details
            </Typography>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time Slot</TableCell>
                    <TableCell>Tour Type</TableCell>
                    <TableCell>Tour Count</TableCell>
                    <TableCell>Required Staff</TableCell>
                    <TableCell>Tours/Guide</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Bookings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importResults.generatedShifts.map((shift, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={shift.timeSlot} color="primary" size="small" />
                      </TableCell>
                      <TableCell>{shift.tourType}</TableCell>
                      <TableCell>
                        <Chip 
                          label={`${shift.tourCount} tours`} 
                          color="success" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${shift.requiredStaff} staff`} 
                          color="secondary" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{shift.toursPerGuide}</TableCell>
                      <TableCell>{shift.duration}h</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => toggleSection(`bookings-${index}`)}
                        >
                          {shift.bookings.length} bookings
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Expandable booking details */}
            {importResults.generatedShifts.map((shift, index) => (
              <Accordion 
                key={`bookings-${index}`}
                expanded={expandedSections[`bookings-${index}`]}
                onChange={() => toggleSection(`bookings-${index}`)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    {shift.timeSlot} - {shift.tourType} ({shift.bookings.length} bookings)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell>Guests</TableCell>
                        <TableCell>Product</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shift.bookings.map((booking, bookingIndex) => (
                        <TableRow key={bookingIndex}>
                          <TableCell>{booking.customerName}</TableCell>
                          <TableCell>{booking.guestCount}</TableCell>
                          <TableCell>{booking.product}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default CSVImportTab;
