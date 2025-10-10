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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useData } from '../context/DataContext';
import { roleHelpers } from '../lib/supabaseHelpers';

function RoleCreationTab() {
  const { roles, dispatch } = useData();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const roleNameInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tier: 1,
  });

  const handleOpenDialog = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        tier: parseInt(role.tier) || 1, // Convert to number and default to 1
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        tier: 1,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      tier: 1,
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      const roleData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        tier: formData.tier || 1,
      };
      
      console.log('Saving role with data:', roleData);

      if (editingRole) {
        const updatedRole = await roleHelpers.update(editingRole.id, roleData);
        dispatch({ type: 'UPDATE_ROLE', payload: updatedRole });
      } else {
        const newRole = await roleHelpers.add(roleData);
        dispatch({ type: 'ADD_ROLE', payload: newRole });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving role:', error);
      alert(`Error saving role: ${error.message}. Please try again.`);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (window.confirm('Are you sure you want to delete this role? This will affect all staff trained for this role.')) {
      try {
        await roleHelpers.delete(roleId);
        dispatch({ type: 'DELETE_ROLE', payload: roleId });
      } catch (error) {
        console.error('Error deleting role:', error);
        alert(`Error deleting role: ${error.message}. Please try again.`);
      }
    }
  };

  // Auto-focus on role name input when dialog opens
  useEffect(() => {
    if (openDialog && roleNameInputRef.current) {
      roleNameInputRef.current.focus();
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
        <Typography variant="h4">Role Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Role
        </Button>
      </Box>

      <Grid container spacing={3}>
        {roles.map((role) => (
          <Grid item xs={12} md={6} lg={4} key={role.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {role.name}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(role)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRole(role.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                {role.description && (
                  <Typography variant="body2" color="text.secondary">
                    {role.description}
                  </Typography>
                )}

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`Tier ${parseInt(role.tier) || 1}`}
                    size="small"
                    variant="filled"
                    color={(parseInt(role.tier) || 1) === 1 ? 'error' : (parseInt(role.tier) || 1) === 2 ? 'warning' : 'default'}
                  />
                  <Chip
                    label={`ID: ${role.id}`}
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

      {roles.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No roles created yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Create your first role to get started
          </Typography>
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRole ? 'Edit Role' : 'Add New Role'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Role Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onKeyPress={handleKeyPress}
              inputRef={roleNameInputRef}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Priority Tier</InputLabel>
              <Select
                value={formData.tier ?? 1}
                onChange={(e) => setFormData({ ...formData, tier: parseInt(e.target.value) })}
                label="Priority Tier"
              >
                <MenuItem value={1}>Tier 1 (Highest Priority)</MenuItem>
                <MenuItem value={2}>Tier 2 (Medium Priority)</MenuItem>
                <MenuItem value={3}>Tier 3 (Lowest Priority)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingRole ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RoleCreationTab;
