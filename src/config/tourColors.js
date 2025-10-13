// Centralized tour color configuration
// This file manages all tour color definitions across the application

export const DEFAULT_TOUR_COLORS = {
  default: { name: 'Default', color: '#9e9e9e' },
  blue: { name: 'Tree House', color: '#2196f3' },
  red: { name: 'Closed', color: '#f44336' },
  yellow: { name: 'Pending', color: '#ffeb3b' },
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
  // Debug: Log the color resolution process
  console.log(`🎨 getTourColorValue - Debug:`, {
    tourId,
    tourName: tour?.name,
    tourDefaultColor: tour?.default_color,
    shiftTourColors,
    hasShiftColor: !!(shiftTourColors && shiftTourColors[tourId]),
    shiftColorValue: shiftTourColors?.[tourId],
    fullTourData: tour
  });
  
  // First check if there's a custom color for this tour in this shift
  if (shiftTourColors && shiftTourColors[tourId]) {
    const shiftColorKey = shiftTourColors[tourId];
    const shiftColorData = getTourColor(shiftColorKey);
    console.log(`🎨 getTourColorValue - Using shift color:`, { shiftColorKey, shiftColorData });
    return shiftColorData.color;
  }
  // Then check the tour's default color
  if (tour && tour.default_color) {
    const colorKey = tour.default_color;
    const colorData = getTourColor(colorKey);
    console.log(`🎨 getTourColorValue - Using tour default color:`, { colorKey, colorData });
    return colorData.color;
  }
  // Fallback to default
  console.log(`🎨 getTourColorValue - Using fallback default color`);
  return DEFAULT_TOUR_COLORS.default.color;
};
