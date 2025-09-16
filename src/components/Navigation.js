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
  useMediaQuery,
  useTheme,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { 
  ArrowDropDown, 
  Settings, 
  Logout, 
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Visibility as ViewerIcon,
  Build as BuilderIcon,
  Storage as DataIcon
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasData } = useData();
  const { user, logout, hasPermission } = useAuth();
  const [managerMenuAnchor, setManagerMenuAnchor] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Manager-only features (dropdown menu)
  const managerFeatures = [
    { label: 'Staff', path: '/staff' },
    { label: 'Roles', path: '/roles' },
    { label: 'Tours', path: '/tours' },
    { label: 'Shifts', path: '/shifts' },
    { label: 'Time Off', path: '/time-off' },
    { label: 'Accounts', path: '/accounts' },
    { label: 'CSV Import', path: '/csv-import' },
  ];

  // Main tabs (role-based visibility)
  const allMainTabs = [
    { label: 'Builder', path: '/builder', requiredRole: 'supervisor', icon: <BuilderIcon /> },
    { label: 'Viewer', path: '/viewer', requiredRole: 'staff', icon: <ViewerIcon /> },
    { label: 'Dashboard', path: '/dashboard', requiredRole: 'staff', icon: <DashboardIcon /> },
    { label: 'Data', path: '/data', requiredRole: 'manager', icon: <DataIcon /> },
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

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleMobileMenuClose();
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
        
        {/* User Info - Hide on mobile */}
        {user && !isMobile && (
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user.name} ({user.role})
          </Typography>
        )}
        
        {/* Mobile Navigation */}
        {isMobile ? (
          <>
            <IconButton
              color="inherit"
              onClick={handleMobileMenuOpen}
              sx={{ ml: 1 }}
              title="Menu"
            >
              <MenuIcon />
            </IconButton>
            
            <Menu
              anchorEl={mobileMenuAnchor}
              open={Boolean(mobileMenuAnchor)}
              onClose={handleMobileMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              sx={{ mt: 1 }}
              disableScrollLock={true}
              disablePortal={false}
            >
              {/* User Info in Mobile Menu */}
              {user && (
                <MenuItem disabled>
                  <ListItemText 
                    primary={user.name} 
                    secondary={user.role}
                    sx={{ color: 'text.secondary' }}
                  />
                </MenuItem>
              )}
              
              {user && <Divider />}
              
              {/* Main Navigation Items */}
              {mainTabs.map((tab) => (
                <MenuItem
                  key={tab.path}
                  onClick={() => handleNavigation(tab.path)}
                  selected={location.pathname === tab.path}
                >
                  <ListItemIcon>{tab.icon}</ListItemIcon>
                  <ListItemText>{tab.label}</ListItemText>
                </MenuItem>
              ))}
              
              {/* Manager Features */}
              {hasPermission('manager') && (
                <>
                  <Divider />
                  <MenuItem disabled>
                    <ListItemText 
                      primary="Manager Tools" 
                      sx={{ color: 'text.secondary', fontWeight: 'bold' }}
                    />
                  </MenuItem>
                  {managerFeatures.map((feature) => (
                    <MenuItem
                      key={feature.path}
                      onClick={() => handleNavigation(feature.path)}
                      selected={location.pathname === feature.path}
                    >
                      <ListItemIcon><Settings /></ListItemIcon>
                      <ListItemText>{feature.label}</ListItemText>
                    </MenuItem>
                  ))}
                </>
              )}
              
              {/* Logout */}
              {user && (
                <>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon><Logout /></ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </>
              )}
            </Menu>
          </>
        ) : (
          /* Desktop Navigation */
          <>
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
                  disableScrollLock={true}
                  disablePortal={false}
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
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navigation;
