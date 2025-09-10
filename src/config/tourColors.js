// Centralized tour color configuration
// This file manages all tour color definitions across the application

export const DEFAULT_TOUR_COLORS = {
  default: { name: 'Default', color: '#9e9e9e' },
  blue: { name: 'Tree House', color: '#2196f3' },
  red: { name: 'Closed', color: '#f44336' },
  yellow: { name: 'Pending', color: '#ffeb3b' },
  green: { name: 'Green', color: '#4caf50' },
  purple: { name: 'Purple', color: '#9c27b0' },
  orange: { name: 'Orange', color: '#ff9800' },
  pink: { name: 'Pink', color: '#e91e63' },
  teal: { name: 'Teal', color: '#009688' },
  indigo: { name: 'Indigo', color: '#3f51b5' },
};

// Helper function to get tour color data
export const getTourColor = (colorKey) => {
  return DEFAULT_TOUR_COLORS[colorKey] || DEFAULT_TOUR_COLORS.default;
};

// Helper function to get all available colors
export const getAllTourColors = () => {
  return DEFAULT_TOUR_COLORS;
};

// Helper function to get tour color value (for background color)
export const getTourColorValue = (tour, shiftTourColors, tourId) => {
  // First check if there's a custom color for this tour in this shift
  if (shiftTourColors && shiftTourColors[tourId]) {
    return shiftTourColors[tourId];
  }
  // Then check the tour's default color
  if (tour && tour.default_color) {
    const colorKey = tour.default_color;
    return getTourColor(colorKey).color;
  }
  // Fallback to default
  return DEFAULT_TOUR_COLORS.default.color;
};
