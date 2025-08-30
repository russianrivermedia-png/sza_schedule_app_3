import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';

function DataManagement() {
  const { hasData } = useData();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');

  const exportData = () => {
    const data = localStorage.getItem('szaScheduleData');
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sza-schedule-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const importDataFromText = () => {
    try {
      const parsed = JSON.parse(importData);
      
      // Validate the data structure
      if (!parsed.staff || !parsed.roles || !parsed.shifts || !parsed.tours || !parsed.schedules || !parsed.timeOffRequests) {
        throw new Error('Invalid data format. Missing required fields.');
      }

      // Save to localStorage
      localStorage.setItem('szaScheduleData', importData);
      
      // Reload the page to apply the new data
      window.location.reload();
    } catch (error) {
      setImportError(error.message);
    }
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
      localStorage.removeItem('szaScheduleData');
      window.location.reload();
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Management
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportData}
        >
          Export Data
        </Button>

        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={() => setImportDialogOpen(true)}
        >
          Import Data
        </Button>

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={clearAllData}
        >
          Clear All Data
        </Button>
      </Box>

      {!hasData && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body1">
            No data found. Start by adding staff members, roles, shifts, and tours.
          </Typography>
        </Alert>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Data</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> Importing data will replace all existing data. Make sure to export your current data first if you want to keep it.
              </Typography>
            </Alert>
            
            <TextField
              fullWidth
              multiline
              rows={10}
              label="Paste JSON Data"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste your exported JSON data here..."
              error={!!importError}
              helperText={importError || 'Paste the JSON data from an exported file'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={importDataFromText} 
            variant="contained"
            disabled={!importData.trim()}
          >
            Import Data
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DataManagement;
