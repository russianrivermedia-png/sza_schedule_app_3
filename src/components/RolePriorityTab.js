import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  DragIndicator,
  Add,
  Delete,
  Save,
  RestoreFromTrash,
  ExpandMore,
  Warning,
  CheckCircle,
  Info
} from '@mui/icons-material';
// Using native HTML5 drag and drop instead of external library

const RolePriorityTab = ({ roles, onSaveTiers, onLoadTiers, currentTiers }) => {
  const [tiers, setTiers] = useState([]);
  const [unassignedRoles, setUnassignedRoles] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [availablePresets, setAvailablePresets] = useState([]);

  // Initialize tiers with default structure
  useEffect(() => {
    if (!currentTiers || currentTiers.length === 0) {
      const defaultTiers = [
        {
          id: 'tier-1',
          name: 'Tier 1 - Critical',
          description: 'Essential roles that must be filled first',
          roles: [],
          constraints: 'strict',
          color: '#d32f2f',
          order: 1
        },
        {
          id: 'tier-2',
          name: 'Tier 2 - Important',
          description: 'Important roles for operations',
          roles: [],
          constraints: 'moderate',
          color: '#f57c00',
          order: 2
        },
        {
          id: 'tier-3',
          name: 'Tier 3 - Standard',
          description: 'Standard operational roles',
          roles: [],
          constraints: 'relaxed',
          color: '#1976d2',
          order: 3
        },
        {
          id: 'tier-4',
          name: 'Tier 4 - Fill',
          description: 'Fill remaining roles',
          roles: [],
          constraints: 'flexible',
          color: '#388e3c',
          order: 4
        }
      ];
      setTiers(defaultTiers);
    } else {
      setTiers(currentTiers);
    }
  }, [currentTiers]);

  // Update unassigned roles when tiers change
  useEffect(() => {
    const assignedRoleIds = tiers.flatMap(tier => tier.roles.map(role => role.id));
    const unassigned = roles.filter(role => !assignedRoleIds.includes(role.id));
    setUnassignedRoles(unassigned);
  }, [tiers, roles]);

  const moveRoleToTier = (roleId, targetTierId) => {
    // Find the role
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    // Remove from current location
    const newTiers = tiers.map(tier => ({
      ...tier,
      roles: tier.roles.filter(r => r.id !== roleId)
    }));
    
    const newUnassigned = unassignedRoles.filter(r => r.id !== roleId);

    // Add to target tier
    if (targetTierId === 'unassigned') {
      setUnassignedRoles([...newUnassigned, role]);
    } else {
      const targetTierIndex = newTiers.findIndex(tier => tier.id === targetTierId);
      if (targetTierIndex !== -1) {
        newTiers[targetTierIndex] = {
          ...newTiers[targetTierIndex],
          roles: [...newTiers[targetTierIndex].roles, role]
        };
      }
    }

    setTiers(newTiers);
    setIsDirty(true);
  };

  const moveRoleUp = (tierId, roleIndex) => {
    const tierIndex = tiers.findIndex(tier => tier.id === tierId);
    if (tierIndex === -1 || roleIndex === 0) return;

    const newTiers = [...tiers];
    const roles = [...newTiers[tierIndex].roles];
    [roles[roleIndex - 1], roles[roleIndex]] = [roles[roleIndex], roles[roleIndex - 1]];
    newTiers[tierIndex] = { ...newTiers[tierIndex], roles };
    setTiers(newTiers);
    setIsDirty(true);
  };

  const moveRoleDown = (tierId, roleIndex) => {
    const tierIndex = tiers.findIndex(tier => tier.id === tierId);
    if (tierIndex === -1 || roleIndex === tiers[tierIndex].roles.length - 1) return;

    const newTiers = [...tiers];
    const roles = [...newTiers[tierIndex].roles];
    [roles[roleIndex], roles[roleIndex + 1]] = [roles[roleIndex + 1], roles[roleIndex]];
    newTiers[tierIndex] = { ...newTiers[tierIndex], roles };
    setTiers(newTiers);
    setIsDirty(true);
  };

  const handleTierNameChange = (tierId, newName) => {
    const newTiers = tiers.map(tier => 
      tier.id === tierId ? { ...tier, name: newName } : tier
    );
    setTiers(newTiers);
    setIsDirty(true);
  };

  const handleTierDescriptionChange = (tierId, newDescription) => {
    const newTiers = tiers.map(tier => 
      tier.id === tierId ? { ...tier, description: newDescription } : tier
    );
    setTiers(newTiers);
    setIsDirty(true);
  };

  const handleTierConstraintsChange = (tierId, newConstraints) => {
    const newTiers = tiers.map(tier => 
      tier.id === tierId ? { ...tier, constraints: newConstraints } : tier
    );
    setTiers(newTiers);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSaveTiers(tiers);
    setIsDirty(false);
  };

  const handleReset = () => {
    setTiers(currentTiers || []);
    setIsDirty(false);
  };

  const getConstraintDescription = (constraint) => {
    const descriptions = {
      strict: 'No time off conflicts, must respect target shifts',
      moderate: 'Allow minor time off conflicts',
      relaxed: 'Allow more flexibility with constraints',
      flexible: 'Maximum flexibility, fill gaps'
    };
    return descriptions[constraint] || 'Unknown constraint level';
  };

  const getConstraintColor = (constraint) => {
    const colors = {
      strict: '#d32f2f',
      moderate: '#f57c00',
      relaxed: '#1976d2',
      flexible: '#388e3c'
    };
    return colors[constraint] || '#666';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Role Priority Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RestoreFromTrash />}
            onClick={handleReset}
            disabled={!isDirty}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={!isDirty}
            color="primary"
          >
            Save Configuration
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Drag and drop roles between tiers to set their priority. Roles in higher tiers (1-4) will be assigned first during auto-assignment.
      </Alert>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Tiers */}
          {tiers.map((tier) => (
            <Paper
              key={tier.id}
              sx={{
                flex: 1,
                minWidth: 300,
                p: 2,
                border: `2px solid ${tier.color}`,
                borderRadius: 2
              }}
            >
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={tier.name}
                  onChange={(e) => handleTierNameChange(tier.id, e.target.value)}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  variant="outlined"
                  size="small"
                  multiline
                  rows={2}
                  value={tier.description}
                  onChange={(e) => handleTierDescriptionChange(tier.id, e.target.value)}
                  sx={{ mb: 1 }}
                />
                <FormControl fullWidth size="small">
                  <InputLabel>Constraints</InputLabel>
                  <Select
                    value={tier.constraints}
                    onChange={(e) => handleTierConstraintsChange(tier.id, e.target.value)}
                    label="Constraints"
                  >
                    <MenuItem value="strict">Strict</MenuItem>
                    <MenuItem value="moderate">Moderate</MenuItem>
                    <MenuItem value="relaxed">Relaxed</MenuItem>
                    <MenuItem value="flexible">Flexible</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {getConstraintDescription(tier.constraints)}
                </Typography>
              </Box>

              <Droppable droppableId={tier.id}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      minHeight: 200,
                      p: 1,
                      bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                      borderRadius: 1,
                      border: '1px dashed',
                      borderColor: snapshot.isDraggingOver ? 'primary.main' : 'divider'
                    }}
                  >
                    {tier.roles.map((role, index) => (
                      <Draggable key={role.id} draggableId={role.id} index={index}>
                        {(provided, snapshot) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{
                              p: 1,
                              mb: 1,
                              bgcolor: snapshot.isDragging ? 'primary.light' : 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              cursor: 'grab',
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                          >
                            <DragIndicator color="action" />
                            <Chip
                              label={role.name}
                              size="small"
                              sx={{ bgcolor: tier.color, color: 'white' }}
                            />
                          </Box>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {tier.roles.length === 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        Drop roles here
                      </Typography>
                    )}
                  </Box>
                )}
              </Droppable>
            </Paper>
          ))}

          {/* Unassigned Roles */}
          <Paper
            sx={{
              flex: 1,
              minWidth: 300,
              p: 2,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              Unassigned Roles
            </Typography>
            <Droppable droppableId="unassigned">
              {(provided, snapshot) => (
                <Box
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    minHeight: 200,
                    p: 1,
                    bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: snapshot.isDraggingOver ? 'primary.main' : 'divider'
                  }}
                >
                  {unassignedRoles.map((role, index) => (
                    <Draggable key={role.id} draggableId={role.id} index={index}>
                      {(provided, snapshot) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          sx={{
                            p: 1,
                            mb: 1,
                            bgcolor: snapshot.isDragging ? 'primary.light' : 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            cursor: 'grab',
                            '&:hover': {
                              bgcolor: 'action.hover'
                            }
                          }}
                        >
                          <DragIndicator color="action" />
                          <Chip
                            label={role.name}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {unassignedRoles.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      All roles assigned
                    </Typography>
                  )}
                </Box>
              )}
            </Droppable>
          </Paper>
        </Box>
      </DragDropContext>

      {/* Summary */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Assignment Summary
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {tiers.map((tier) => (
            <Box key={tier.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: tier.color
                }}
              />
              <Typography variant="body2">
                {tier.name}: {tier.roles.length} roles
              </Typography>
            </Box>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: 'grey.400'
              }}
            />
            <Typography variant="body2">
              Unassigned: {unassignedRoles.length} roles
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default RolePriorityTab;
