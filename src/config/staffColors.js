// Centralized staff color configuration
// This file manages all staff color definitions across the application

export const DEFAULT_STAFF_COLORS = {
  default: { name: 'Default', color: '#9e9e9e' },
  blue: { name: 'Blue', color: '#2196f3' },
  red: { name: 'Red', color: '#f44336' },
  green: { name: 'Green', color: '#4caf50' },
};

// Helper function to get staff color data
export const getStaffColor = (colorKey) => {
  return DEFAULT_STAFF_COLORS[colorKey] || DEFAULT_STAFF_COLORS.default;
};

// Helper function to get all available colors
export const getAllStaffColors = () => {
  return DEFAULT_STAFF_COLORS;
};

// Helper function to get staff color value (for background color)
export const getStaffColorValue = (staffMember, shiftStaffColors, staffId) => {
  // First check if there's a custom color for this staff in this shift
  if (shiftStaffColors && shiftStaffColors[staffId]) {
    return shiftStaffColors[staffId];
  }
  // Then check the staff member's default color
  if (staffMember && staffMember.staff_color) {
    const colorKey = staffMember.staff_color;
    return getStaffColor(colorKey).color;
  }
  // Fallback to default
  return DEFAULT_STAFF_COLORS.default.color;
};
