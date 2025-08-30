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

const TOUR_COLORS = {
  default: '#9e9e9e', // Gray
  blue: '#2196f3',    // Blue
  red: '#f44336',     // Red
  yellow: '#ffeb3b',  // Yellow
};

const TOUR_COLOR_NAMES = {
  default: 'Default',
  blue: 'Confirmed',
  red: 'Cancelled',
  yellow: 'Open',
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
        const tourColor = tourColors?.[tour.id] || 'default';
        const backgroundColor = TOUR_COLORS[tourColor];
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
        {Object.entries(TOUR_COLORS).map(([colorKey, colorValue]) => (
          <MenuItem
            key={colorKey}
            onClick={() => handleColorSelect(colorKey)}
            sx={{
              '&:hover': {
                backgroundColor: colorValue,
                color: colorKey === 'yellow' ? '#000' : '#fff',
              },
            }}
          >
            <ListItemIcon>
              <CircleIcon sx={{ color: colorValue }} />
            </ListItemIcon>
            <ListItemText primary={TOUR_COLOR_NAMES[colorKey]} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

export default TourDisplay;
