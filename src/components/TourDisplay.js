import React, { useState } from 'react';
import {
  Box,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Circle as CircleIcon,
} from '@mui/icons-material';

// Default tour color options (should match TourCreationTab.js)
const DEFAULT_TOUR_COLORS = {
  default: { name: 'Default', color: '#9e9e9e' },
  blue: { name: 'Confirmed', color: '#2196f3' },
  red: { name: 'Cancelled', color: '#f44336' },
  yellow: { name: 'Open', color: '#ffeb3b' },
};

function TourDisplay({ tours, tourColors, onTourColorChange, size = 'small' }) {
  const [colorMenuAnchor, setColorMenuAnchor] = useState(null);
  const [selectedTourId, setSelectedTourId] = useState(null);

  const handleColorClick = (event, tourId) => {
    setColorMenuAnchor(event.currentTarget);
    setSelectedTourId(tourId);
  };

  const handleColorSelect = (color) => {
    if (selectedTourId) {
      onTourColorChange(selectedTourId, color);
    }
    setColorMenuAnchor(null);
    setSelectedTourId(null);
  };

  const handleCloseMenu = () => {
    setColorMenuAnchor(null);
    setSelectedTourId(null);
  };

  if (!tours || tours.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
      {tours.map((tour) => {
        const tourColor = tourColors?.[tour.id] || tour.default_color || 'default';
        const colorData = DEFAULT_TOUR_COLORS[tourColor] || { color: '#9e9e9e', name: 'Default' };
        const backgroundColor = colorData.color;
        const textColor = tourColor === 'yellow' ? '#000' : '#fff';

        return (
          <Chip
            key={tour.id}
            label={tour.name}
            size={size}
            sx={{
              backgroundColor,
              color: textColor,
              '&:hover': {
                backgroundColor,
                opacity: 0.8,
              },
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={(event) => handleColorClick(event, tour.id)}
            icon={
              <CircleIcon 
                sx={{ 
                  color: textColor, 
                  fontSize: size === 'small' ? '16px' : '20px' 
                }} 
              />
            }
          />
        );
      })}

      <Menu
        anchorEl={colorMenuAnchor}
        open={Boolean(colorMenuAnchor)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {Object.entries(DEFAULT_TOUR_COLORS).map(([colorKey, colorData]) => (
          <MenuItem
            key={colorKey}
            onClick={() => handleColorSelect(colorKey)}
            sx={{
              '&:hover': {
                backgroundColor: colorData.color,
                color: colorKey === 'yellow' ? '#000' : '#fff',
              },
            }}
          >
            <ListItemIcon>
              <CircleIcon sx={{ color: colorData.color }} />
            </ListItemIcon>
            <ListItemText primary={colorData.name} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

export default TourDisplay;
