import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import { useData } from '../context/DataContext';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasData } = useData();

  const tabs = [
    { label: 'Staff', path: '/staff' },
    { label: 'Roles', path: '/roles' },
    { label: 'Tours', path: '/tours' },
    { label: 'Shifts', path: '/shifts' },
    { label: 'Builder', path: '/builder' },
    { label: 'Viewer', path: '/viewer' },
    { label: 'Data', path: '/data' },
  ];

  const currentTab = tabs.findIndex(tab => tab.path === location.pathname);

  const handleTabChange = (event, newValue) => {
    navigate(tabs[newValue].path);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          SZA Schedule App
        </Typography>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          textColor="inherit"
          indicatorColor="secondary"
        >
          {tabs.map((tab, index) => (
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
