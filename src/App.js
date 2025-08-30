import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import Navigation from './components/Navigation';
import StaffTab from './components/StaffTab';
import RoleCreationTab from './components/RoleCreationTab';
import TourCreationTab from './components/TourCreationTab';
import ShiftCreationTab from './components/ShiftCreationTab';
import ScheduleBuilderTab from './components/ScheduleBuilderTab';
import ScheduleViewerTab from './components/ScheduleViewerTab';
import DataManagement from './components/DataManagement';
import { DataProvider } from './context/DataContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DataProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navigation />
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <Routes>
                <Route path="/" element={<Navigate to="/staff" replace />} />
                <Route path="/staff" element={<StaffTab />} />
                <Route path="/roles" element={<RoleCreationTab />} />
                <Route path="/tours" element={<TourCreationTab />} />
                <Route path="/shifts" element={<ShiftCreationTab />} />
                <Route path="/builder" element={<ScheduleBuilderTab />} />
                <Route path="/viewer" element={<ScheduleViewerTab />} />
                <Route path="/data" element={<DataManagement />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;
