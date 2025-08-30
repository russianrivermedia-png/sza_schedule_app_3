import React from 'react';
import { useDrag } from 'react-dnd';
import {
  Chip,
  Tooltip,
  Box,
} from '@mui/material';
import { useData } from '../context/DataContext';

function DraggableStaff({ staff, onStaffDrop, onStaffColorChange, staffColor, roles }) {
  const { timeOffRequests, getTimeOffByStaffId } = useData();
  
  const [{ isDragging }, drag] = useDrag({
    type: 'staff',
    item: { id: staff.id, type: 'staff' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Use optimized time off lookup
  const hasTimeOff = getTimeOffByStaffId(staff.id).some(t =>
    t.status === 'approved' &&
    new Date(t.startDate) <= new Date() &&
    new Date(t.endDate) >= new Date()
  );

  // Get trained roles
  const trainedRoles = staff.trainedRoles.map(roleId => 
    roles.find(r => r.id === roleId)?.name
  ).filter(Boolean);

  const tooltipContent = (
    <Box>
      <div><strong>Name:</strong> {staff.name}</div>
      {staff.email && <div><strong>Email:</strong> {staff.email}</div>}
      {staff.phone && <div><strong>Phone:</strong> {staff.phone}</div>}
      <div><strong>Availability:</strong> {staff.availability.join(', ')}</div>
      <div><strong>Trained Roles:</strong> {trainedRoles.join(', ')}</div>
      <div><strong>Target Shifts:</strong> {staff.targetShifts || 5}</div>
      {hasTimeOff && <div style={{ color: '#f44336' }}><strong>⚠️ Has approved time off</strong></div>}
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top">
      <Chip
        ref={drag}
        label={displayName || staff.name}
        color={hasTimeOff ? 'warning' : 'primary'}
        variant="outlined"
        size="medium"
        sx={{
          cursor: 'grab',
          opacity: isDragging ? 0.5 : 1,
          '&:active': {
            cursor: 'grabbing',
          },
          maxWidth: 150,
          '& .MuiChip-label': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      />
    </Tooltip>
  );
}

export default DraggableStaff;
