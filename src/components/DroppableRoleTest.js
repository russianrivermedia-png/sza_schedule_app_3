import React, { useState } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import { format } from 'date-fns';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
  Button
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

function DroppableRoleTest({ 
  role, 
  assignedStaff, 
  conflicts, 
  onStaffDrop, 
  onRemoveStaff, 
  onStaffColorChange, 
  staffColor, 
  staff, 
  roles, 
  timeOffRequests, 
  day,
  shiftIndex,
  onOpenStaffSelection
}) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'staff',
    drop: (item) => {
      console.log('DroppableRoleTest drop:', { item, hasSourceInfo: !!item.sourceInfo });
      // If the item has source info, pass it along for swapping/moving
      if (item.sourceInfo) {
        onStaffDrop(item.id, item.sourceInfo);
      } else {
        // Simple assignment from staff panel
        onStaffDrop(item.id);
      }
    },
    canDrop: () => true,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  // Safety check for role object - after hooks
  if (!role) {
    console.error('DroppableRoleTest: role object is undefined', { role, assignedStaff });
    return null;
  }

  const hasConflicts = conflicts && conflicts.length > 0;

  const handleStaffSelectionClick = () => {
    if (onOpenStaffSelection) {
      onOpenStaffSelection(day, shiftIndex, role.id);
    }
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
              roleName={role.name}
              day={day}
              shiftIndex={shiftIndex}
              roleId={role.id}
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
            <Button
              variant="outlined"
              size="small"
              onClick={handleStaffSelectionClick}
              startIcon={<PersonAddIcon />}
              sx={{ 
                minWidth: 120,
                fontSize: '0.75rem',
                textTransform: 'none'
              }}
            >
              Select Staff
            </Button>
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
    </Box>
  );
}

// Draggable Staff Chip Component
function DraggableStaffChip({ staff, staffColor, hasConflicts, roleName, day, shiftIndex, roleId }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'staff',
    item: { 
      id: staff.id, 
      type: 'assigned',
      sourceInfo: {
        dayKey: format(day, 'yyyy-MM-dd'),
        shiftIndex: shiftIndex,
        roleId: roleId
      }
    },
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
    console.error('DroppableRoleTest: staff object is undefined or missing name property', { staff, roleName });
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

export default DroppableRoleTest;
