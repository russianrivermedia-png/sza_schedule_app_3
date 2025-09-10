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
import { DEFAULT_TOUR_COLORS, getTourColor } from '../config/tourColors';

function TourDisplay({ tours, tourColors, onTourColorChange, size = 'small' }) {
  const [colorMenuAnchor, setColorMenuAnchor] = useState(null);
  const [selectedTourId, setSelectedTourId] = useState(null);

  const handleColorClick = (event, tourId) => {
    event.preventDefault();
    event.stopPropagation();
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
        const colorData = getTourColor(tourColor);
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
        disableScrollLock={true}
        disablePortal={true}
        keepMounted={false}
        MenuListProps={{
          'aria-labelledby': 'tour-color-menu',
          disablePadding: true,
        }}
        slotProps={{
          paper: {
            sx: {
              maxHeight: '200px',
              overflow: 'auto',
            }
          }
        }}
      >
        {Object.entries(DEFAULT_TOUR_COLORS).map(([colorKey, colorData]) => (
          <MenuItem
            key={colorKey}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleColorSelect(colorKey);
            }}
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
