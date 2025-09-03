import React from 'react';
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
import AccountManagementTab from './components/AccountManagementTab';
import StaffDashboard from './components/StaffDashboard';
import StaffRegistration from './components/StaffRegistration';
import LoginForm from './components/LoginForm';
import ProtectedRoute from './components/ProtectedRoute';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';

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
      <AuthProvider>
      <DataProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navigation />
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  
                  {/* Manager-only routes */}
                  <Route path="/staff" element={
                    <ProtectedRoute requiredRole="manager">
                      <StaffTab />
                    </ProtectedRoute>
                  } />
                  <Route path="/roles" element={
                    <ProtectedRoute requiredRole="manager">
                      <RoleCreationTab />
                    </ProtectedRoute>
                  } />
                  <Route path="/tours" element={
                    <ProtectedRoute requiredRole="manager">
                      <TourCreationTab />
                    </ProtectedRoute>
                  } />
                  <Route path="/shifts" element={
                    <ProtectedRoute requiredRole="manager">
                      <ShiftCreationTab />
                    </ProtectedRoute>
                  } />
                  <Route path="/data" element={
                    <ProtectedRoute requiredRole="manager">
                      <DataManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/accounts" element={
                    <ProtectedRoute requiredRole="manager">
                      <AccountManagementTab />
                    </ProtectedRoute>
                  } />
                  
                  {/* Supervisor and above routes */}
                  <Route path="/builder" element={
                    <ProtectedRoute requiredRole="supervisor">
                      <ScheduleBuilderTab />
                    </ProtectedRoute>
                  } />
                  
                  {/* Staff and above routes */}
                  <Route path="/viewer" element={
                    <ProtectedRoute requiredRole="staff">
                      <ScheduleViewerTab />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute requiredRole="staff">
                      <StaffDashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* Public routes */}
                  <Route path="/login" element={<LoginForm />} />
                  <Route path="/register" element={<StaffRegistration />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
