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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';

function TourCreationTab() {
  const { tours, dispatch } = useData();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTour, setEditingTour] = useState(null);
  const tourInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  const handleOpenDialog = (tour = null) => {
    if (tour) {
      setEditingTour(tour);
      setFormData({
        name: tour.name,
      });
    } else {
      setEditingTour(null);
      setFormData({
        name: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTour(null);
    setFormData({
      name: '',
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    const tourData = {
      id: editingTour?.id || Date.now().toString(),
      name: formData.name.trim(),
    };

    if (editingTour) {
      dispatch({ type: 'UPDATE_TOUR', payload: tourData });
    } else {
      dispatch({ type: 'ADD_TOUR', payload: tourData });
    }

    handleCloseDialog();
  };

  const handleDeleteTour = (tourId) => {
    if (window.confirm('Are you sure you want to delete this tour? This will affect all shifts using this tour.')) {
      dispatch({ type: 'DELETE_TOUR', payload: tourId });
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

                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={`ID: ${tour.id}`}
                    size="small"
                    variant="outlined"
                    color="primary"
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTour ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TourCreationTab;
