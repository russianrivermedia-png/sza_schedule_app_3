import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
  Menu,
  MenuItem,
  Button,
  IconButton,
} from '@mui/material';
import { ArrowDropDown, Settings, Logout } from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasData } = useData();
  const { user, logout, hasPermission } = useAuth();
  const [managerMenuAnchor, setManagerMenuAnchor] = useState(null);

  // Manager-only features (dropdown menu)
  const managerFeatures = [
    { label: 'Staff', path: '/staff' },
    { label: 'Roles', path: '/roles' },
    { label: 'Tours', path: '/tours' },
    { label: 'Shifts', path: '/shifts' },
    { label: 'Accounts', path: '/accounts' },
  ];

  // Main tabs (role-based visibility)
  const allMainTabs = [
    { label: 'Builder', path: '/builder', requiredRole: 'supervisor' },
    { label: 'Viewer', path: '/viewer', requiredRole: 'staff' },
    { label: 'Dashboard', path: '/dashboard', requiredRole: 'staff' },
    { label: 'Data', path: '/data', requiredRole: 'manager' },
  ];

  // Filter tabs based on user permissions
  const mainTabs = allMainTabs.filter(tab => hasPermission(tab.requiredRole));

  const currentTab = mainTabs.findIndex(tab => tab.path === location.pathname);
  const isManagerFeature = managerFeatures.some(feature => feature.path === location.pathname);
  
  // If we're on a manager feature page, don't highlight any main tab
  // Use false to prevent any tab from being selected
  const effectiveCurrentTab = isManagerFeature ? false : currentTab;

  const handleTabChange = (event, newValue) => {
    navigate(mainTabs[newValue].path);
  };

  const handleManagerMenuOpen = (event) => {
    setManagerMenuAnchor(event.currentTarget);
  };

  const handleManagerMenuClose = () => {
    setManagerMenuAnchor(null);
  };

  const handleManagerFeatureSelect = (path) => {
    navigate(path);
    handleManagerMenuClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/viewer');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          SZA Schedule App
        </Typography>
        
        {/* User Info */}
        {user && (
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.name} ({user.role})
          </Typography>
        )}
        
        {/* Manager Features Dropdown - Only show for managers */}
        {hasPermission('manager') && (
          <>
            <Button
              color="inherit"
              onClick={handleManagerMenuOpen}
              endIcon={<ArrowDropDown />}
              startIcon={<Settings />}
              sx={{ 
                mr: 2,
                backgroundColor: isManagerFeature ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              Manager
            </Button>
            
            <Menu
              anchorEl={managerMenuAnchor}
              open={Boolean(managerMenuAnchor)}
              onClose={handleManagerMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
            >
              {managerFeatures.map((feature) => (
                <MenuItem
                  key={feature.path}
                  onClick={() => handleManagerFeatureSelect(feature.path)}
                  selected={location.pathname === feature.path}
                >
                  {feature.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

        {/* Main Tabs */}
        <Tabs
          value={effectiveCurrentTab === false ? false : (effectiveCurrentTab >= 0 ? effectiveCurrentTab : 0)}
          onChange={handleTabChange}
          textColor="inherit"
          indicatorColor="secondary"
        >
          {mainTabs.map((tab, index) => (
            <Tab
              key={tab.path}
              label={tab.label}
              sx={{ minHeight: 64 }}
            />
          ))}
        </Tabs>

        {/* Logout Button */}
        {user && (
          <IconButton
            color="inherit"
            onClick={handleLogout}
            sx={{ ml: 1 }}
            title="Logout"
          >
            <Logout />
          </IconButton>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navigation;
