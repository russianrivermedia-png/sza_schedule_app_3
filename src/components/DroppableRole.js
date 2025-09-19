import React, { useState } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Circle as CircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

function DroppableRole({ role, assignedStaff, conflicts, onStaffDrop, onRemoveStaff, onStaffColorChange, staffColor, staff, roles, timeOffRequests, day }) {
  const [colorMenuAnchor, setColorMenuAnchor] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'staff',
    drop: (item) => onStaffDrop(item.id),
    canDrop: () => true,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  // Safety check for role object - after hooks
  if (!role) {
    console.error('DroppableRole: role object is undefined', { role, assignedStaff });
    return null;
  }

  const hasConflicts = conflicts && conflicts.length > 0;

  const handleColorClick = (event) => {
    setColorMenuAnchor(event.currentTarget);
  };

  const handleColorSelect = (color) => {
    if (onStaffColorChange && assignedStaff) {
      onStaffColorChange(assignedStaff.id, color);
    }
    setColorMenuAnchor(null);
  };

  const handleCloseColorMenu = () => {
    setColorMenuAnchor(null);
  };

  const getColorIcon = (color) => {
    const colorMap = {
      red: '#f44336',
      blue: '#2196f3',
      green: '#4caf50',
      gray: '#9e9e9e'
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Paper
        ref={drop}
        sx={{
          p: 1,
          minHeight: 40,
          minWidth: 120,
          border: '2px dashed',
          borderColor: isOver ? 'primary.main' : 'grey.300',
          backgroundColor: isOver ? 'primary.50' : 'background.paper',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.50',
          },
        }}
      >
        {assignedStaff ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <DraggableStaffChip
              staff={assignedStaff}
              staffColor={staffColor}
              hasConflicts={hasConflicts}
              onColorClick={handleColorClick}
              roleName={role.name}
            />
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveStaff();
              }}
              sx={{ ml: 'auto' }}
            >
              <PersonRemoveIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Staff</InputLabel>
              <Select
                value={selectedStaffId}
                onChange={(e) => {
                  const staffId = e.target.value;
                  setSelectedStaffId(staffId);
                  if (staffId) {
                    // Check for conflicts before assignment
                    const staffMember = staff.find(s => s.id === staffId);
                    if (staffMember && day) {
                      const dayKey = day.toISOString().split('T')[0];
                      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day.getDay()];
                      
                      // Check availability
                      const staffAvailability = staffMember.availability || [];
                      if (!staffAvailability.includes(dayOfWeek)) {
                        const confirmAssignment = window.confirm(
                          `⚠️ AVAILABILITY WARNING: ${staffMember.name} is not available on ${dayOfWeek}.\n\n` +
                          `Are you sure you want to assign them to work on ${new Date(dayKey).toLocaleDateString()}?`
                        );
                        
                        if (!confirmAssignment) {
                          setSelectedStaffId(''); // Reset selection
                          return; // Cancel the assignment
                        }
                      }
                      
                      // Check time off conflicts
                      if (timeOffRequests) {
                        const staffTimeOff = timeOffRequests.filter(t => t.staff_id === staffId);
                        const hasTimeOffOnDay = staffTimeOff.some(timeOff => 
                          timeOff.status === 'approved' &&
                          new Date(timeOff.start_date) <= new Date(dayKey) &&
                          new Date(timeOff.end_date) >= new Date(dayKey)
                        );
                        
                        if (hasTimeOffOnDay) {
                          const timeOffRequest = staffTimeOff.find(timeOff => 
                            timeOff.status === 'approved' &&
                            new Date(timeOff.start_date) <= new Date(dayKey) &&
                            new Date(timeOff.end_date) >= new Date(dayKey)
                          );
                          
                          const startDate = new Date(timeOffRequest.start_date).toLocaleDateString();
                          const endDate = new Date(timeOffRequest.end_date).toLocaleDateString();
                          
                          const confirmAssignment = window.confirm(
                            `⚠️ TIME OFF CONFLICT: ${staffMember.name} has approved time off from ${startDate} to ${endDate}.\n\n` +
                            `Are you sure you want to assign them to work on ${new Date(dayKey).toLocaleDateString()}?`
                          );
                          
                          if (!confirmAssignment) {
                            setSelectedStaffId(''); // Reset selection
                            return; // Cancel the assignment
                          }
                        }
                      }
                    }
                    
                    onStaffDrop(staffId);
                    setSelectedStaffId(''); // Reset selection
                  }
                }}
                label="Select Staff"
                sx={{ minWidth: 120 }}
              >
                                 {staff?.map(staffMember => (
                   <MenuItem key={staffMember.id} value={staffMember.id}>
                     {staffMember.name.split(' ')[0]}
                   </MenuItem>
                 ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Paper>

      {hasConflicts && (
        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
          <Tooltip 
            title={
              <Box>
                {conflicts.map((conflict, index) => (
                  <Box key={index} sx={{ mb: 0.5 }}>
                    • {conflict}
                  </Box>
                ))}
              </Box>
            } 
            arrow 
            placement="top"
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: 'warning.main',
                fontSize: '0.7rem',
                cursor: 'help',
                gap: 0.5,
              }}
            >
              <WarningIcon sx={{ fontSize: '0.8rem' }} />
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
            </Box>
          </Tooltip>
        </Box>
      )}

      {/* Color Picker Menu */}
      <Menu
        anchorEl={colorMenuAnchor}
        open={Boolean(colorMenuAnchor)}
        onClose={handleCloseColorMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => handleColorSelect('red')}>
          <ListItemIcon>
            <CircleIcon sx={{ color: '#f44336' }} />
          </ListItemIcon>
          Red
        </MenuItem>
        <MenuItem onClick={() => handleColorSelect('blue')}>
          <ListItemIcon>
            <CircleIcon sx={{ color: '#2196f3' }} />
          </ListItemIcon>
          Blue
        </MenuItem>
        <MenuItem onClick={() => handleColorSelect('green')}>
          <ListItemIcon>
            <CircleIcon sx={{ color: '#4caf50' }} />
          </ListItemIcon>
          Green
        </MenuItem>
        <MenuItem onClick={() => handleColorSelect('gray')}>
          <ListItemIcon>
            <CircleIcon sx={{ color: '#9e9e9e' }} />
          </ListItemIcon>
          Default Gray
        </MenuItem>
             </Menu>
     </Box>
   );
 }
 
  // Draggable Staff Chip Component
 function DraggableStaffChip({ staff, staffColor, hasConflicts, onColorClick, roleName }) {
   const [{ isDragging }, drag] = useDrag({
     type: 'staff',
     item: { id: staff.id, type: 'assigned' },
     collect: (monitor) => ({
       isDragging: !!monitor.isDragging(),
     }),
   });

   const getColorIcon = (color) => {
     const colorMap = {
       red: '#f44336',
       blue: '#2196f3',
       green: '#4caf50',
       gray: '#9e9e9e'
     };
     return colorMap[color] || colorMap.gray;
   };

  // Safety check for staff object
  if (!staff || !staff.name) {
    console.error('DroppableRole: staff object is undefined or missing name property', { staff, roleName });
    return null;
  }

  return (
    <Tooltip title={roleName || 'Unknown Role'} arrow placement="top">
      <Chip
        ref={drag}
        label={staff.name.split(' ')[0]}
        size="small"
        color={hasConflicts ? 'error' : 'success'}
        variant="filled"
        onClick={onColorClick}
        sx={{
          maxWidth: '100%',
          cursor: 'grab',
          bgcolor: getColorIcon(staffColor),
          color: 'white',
          fontWeight: 'bold',
          opacity: isDragging ? 0.5 : 1,
          '& .MuiChip-label': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          '&:hover': {
            opacity: 0.8,
          },
          '&:active': {
            cursor: 'grabbing',
          },
        }}
      />
    </Tooltip>
  );
 }
 
 export default DroppableRole;
