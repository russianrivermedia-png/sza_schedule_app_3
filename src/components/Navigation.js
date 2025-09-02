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
import { ArrowDropDown, Settings } from '@mui/icons-material';
import { useData } from '../context/DataContext';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasData } = useData();
  const [managerMenuAnchor, setManagerMenuAnchor] = useState(null);

  // Manager-only features (dropdown menu)
  const managerFeatures = [
    { label: 'Staff', path: '/staff' },
    { label: 'Roles', path: '/roles' },
    { label: 'Tours', path: '/tours' },
    { label: 'Shifts', path: '/shifts' },
  ];

  // Main tabs (always visible)
  const mainTabs = [
    { label: 'Builder', path: '/builder' },
    { label: 'Viewer', path: '/viewer' },
    { label: 'Data', path: '/data' },
  ];

  const currentTab = mainTabs.findIndex(tab => tab.path === location.pathname);
  const isManagerFeature = managerFeatures.some(feature => feature.path === location.pathname);

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

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          SZA Schedule App
        </Typography>
        
        {/* Manager Features Dropdown */}
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

        {/* Main Tabs */}
        <Tabs
          value={currentTab >= 0 ? currentTab : 0}
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
      </Toolbar>
    </AppBar>
  );
}

export default Navigation;
