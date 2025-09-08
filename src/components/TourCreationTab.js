import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Palette as PaletteIcon,
  ColorLens as ColorLensIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { tourHelpers } from '../lib/supabaseHelpers';

// Default tour color options
const DEFAULT_TOUR_COLORS = {
  default: { name: 'Default', color: '#9e9e9e' },
  blue: { name: 'Confirmed', color: '#2196f3' },
  red: { name: 'Cancelled', color: '#f44336' },
  yellow: { name: 'Open', color: '#ffeb3b' },
};

function TourCreationTab() {
  const { tours, dispatch } = useData();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTour, setEditingTour] = useState(null);
  const [openColorDialog, setOpenColorDialog] = useState(false);
  const [editingColor, setEditingColor] = useState(null);
  const [customColors, setCustomColors] = useState({});
  const tourInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    default_color: 'default',
  });
  const [colorFormData, setColorFormData] = useState({
    key: '',
    name: '',
    color: '#000000',
  });

  // Get all available colors (default + custom)
  const getAllColors = () => {
    return { ...DEFAULT_TOUR_COLORS, ...customColors };
  };

  // Color management functions
  const handleOpenColorDialog = (color = null) => {
    if (color) {
      setEditingColor(color);
      setColorFormData({
        key: color.key,
        name: color.name,
        color: color.color,
      });
    } else {
      setEditingColor(null);
      setColorFormData({
        key: '',
        name: '',
        color: '#000000',
      });
    }
    setOpenColorDialog(true);
  };

  const handleCloseColorDialog = () => {
    setOpenColorDialog(false);
    setEditingColor(null);
    setColorFormData({
      key: '',
      name: '',
      color: '#000000',
    });
  };

  const handleColorSubmit = () => {
    if (!colorFormData.name.trim() || !colorFormData.key.trim()) return;

    const newColor = {
      key: colorFormData.key.trim(),
      name: colorFormData.name.trim(),
      color: colorFormData.color,
    };

    if (editingColor) {
      // Update existing color
      setCustomColors(prev => ({
        ...prev,
        [colorFormData.key]: newColor,
      }));
    } else {
      // Add new color
      setCustomColors(prev => ({
        ...prev,
        [colorFormData.key]: newColor,
      }));
    }

    handleCloseColorDialog();
  };

  const handleDeleteColor = (colorKey) => {
    if (window.confirm('Are you sure you want to delete this color? Tours using this color will revert to default.')) {
      setCustomColors(prev => {
        const newColors = { ...prev };
        delete newColors[colorKey];
        return newColors;
      });
    }
  };

  const handleOpenDialog = (tour = null) => {
    if (tour) {
      setEditingTour(tour);
      setFormData({
        name: tour.name,
        default_color: tour.default_color || 'default',
      });
    } else {
      setEditingTour(null);
      setFormData({
        name: '',
        default_color: 'default',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTour(null);
    setFormData({
      name: '',
      default_color: 'default',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      const tourData = {
        name: formData.name.trim(),
        default_color: formData.default_color,
      };

      if (editingTour) {
        const updatedTour = await tourHelpers.update(editingTour.id, tourData);
        dispatch({ type: 'UPDATE_TOUR', payload: updatedTour });
      } else {
        const newTour = await tourHelpers.add(tourData);
        dispatch({ type: 'ADD_TOUR', payload: newTour });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving tour:', error);
      
      // Check if it's a column not found error
      if (error.message.includes('default_color') && error.message.includes('schema cache')) {
        alert(`Database schema needs to be updated. Please run this SQL in your database:\n\nALTER TABLE tours ADD COLUMN IF NOT EXISTS default_color TEXT DEFAULT 'default';\n\nThen try again.`);
      } else {
        alert(`Error saving tour: ${error.message}. Please try again.`);
      }
    }
  };

  const handleDeleteTour = async (tourId) => {
    if (window.confirm('Are you sure you want to delete this tour? This will affect all shifts using this tour.')) {
      try {
        await tourHelpers.delete(tourId);
        dispatch({ type: 'DELETE_TOUR', payload: tourId });
      } catch (error) {
        console.error('Error deleting tour:', error);
        alert(`Error deleting tour: ${error.message}. Please try again.`);
      }
    }
  };

  // Auto-focus on tour input when dialog opens
  useEffect(() => {
    if (openDialog && tourInputRef.current) {
      tourInputRef.current.focus();
    }
  }, [openDialog]);

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tour Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Tour
        </Button>
      </Box>

      <Grid container spacing={3}>
        {tours.map((tour) => (
          <Grid item xs={12} md={6} lg={4} key={tour.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {tour.name}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(tour)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteTour(tour.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`ID: ${tour.id}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                  <Chip
                    label={getAllColors()[tour.default_color]?.name || 'Default'}
                    size="small"
                    sx={{
                      backgroundColor: getAllColors()[tour.default_color]?.color || DEFAULT_TOUR_COLORS.default.color,
                      color: tour.default_color === 'yellow' ? '#000' : '#fff',
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {tours.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No tours created yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Create your first tour to get started
          </Typography>
        </Box>
      )}

      {/* Color Management Section */}
      <Box sx={{ mt: 4 }}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PaletteIcon />
              <Typography variant="h6">Tour Color Management</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Available Colors</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenColorDialog()}
                  size="small"
                >
                  Add Color
                </Button>
              </Box>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Manage custom tour colors. Default colors cannot be deleted but can be used as a reference.
              </Alert>

              <List>
                {Object.entries(getAllColors()).map(([colorKey, colorData]) => (
                  <ListItem key={colorKey} divider>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          backgroundColor: colorData.color,
                          borderRadius: '50%',
                          border: '1px solid #ccc',
                        }}
                      />
                      <ListItemText
                        primary={colorData.name}
                        secondary={`Key: ${colorKey}`}
                      />
                    </Box>
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenColorDialog({ key: colorKey, ...colorData })}
                          disabled={Object.keys(DEFAULT_TOUR_COLORS).includes(colorKey)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteColor(colorKey)}
                          disabled={Object.keys(DEFAULT_TOUR_COLORS).includes(colorKey)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTour ? 'Edit Tour' : 'Add New Tour'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Tour Start Time *"
              placeholder="e.g., 9:00 AM, 2:00 PM"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyPress={handleKeyPress}
              inputRef={tourInputRef}
              margin="normal"
              required
              helperText="Enter the time when this tour starts"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Default Color</InputLabel>
              <Select
                value={formData.default_color}
                onChange={(e) => setFormData({ ...formData, default_color: e.target.value })}
                label="Default Color"
              >
                {Object.entries(getAllColors()).map(([colorKey, colorData]) => (
                  <MenuItem key={colorKey} value={colorKey}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          backgroundColor: colorData.color,
                          borderRadius: '50%',
                          border: '1px solid #ccc',
                        }}
                      />
                      {colorData.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTour ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Color Management Dialog */}
      <Dialog open={openColorDialog} onClose={handleCloseColorDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingColor ? 'Edit Color' : 'Add New Color'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Color Key *"
              placeholder="e.g., purple, green, orange"
              value={colorFormData.key}
              onChange={(e) => setColorFormData({ ...colorFormData, key: e.target.value })}
              margin="normal"
              required
              helperText="Unique identifier for this color (lowercase, no spaces)"
              disabled={!!editingColor}
            />
            
            <TextField
              fullWidth
              label="Color Name *"
              placeholder="e.g., Purple, Green, Orange"
              value={colorFormData.name}
              onChange={(e) => setColorFormData({ ...colorFormData, name: e.target.value })}
              margin="normal"
              required
              helperText="Display name for this color"
            />
            
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Color Preview
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: colorFormData.color,
                    borderRadius: '50%',
                    border: '2px solid #ccc',
                  }}
                />
                <TextField
                  label="Hex Color"
                  value={colorFormData.color}
                  onChange={(e) => setColorFormData({ ...colorFormData, color: e.target.value })}
                  size="small"
                  sx={{ width: 120 }}
                  placeholder="#000000"
                />
                <input
                  type="color"
                  value={colorFormData.color}
                  onChange={(e) => setColorFormData({ ...colorFormData, color: e.target.value })}
                  style={{ width: 40, height: 40, border: 'none', borderRadius: '50%', cursor: 'pointer' }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseColorDialog}>Cancel</Button>
          <Button onClick={handleColorSubmit} variant="contained">
            {editingColor ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TourCreationTab;
