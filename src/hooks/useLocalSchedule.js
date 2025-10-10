import { useState, useCallback, useEffect } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';

/**
 * Custom hook for managing local schedule state
 * Provides clean separation between local editing and database persistence
 */
export const useLocalSchedule = (selectedWeek, schedules) => {
  const [localSchedule, setLocalSchedule] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Calculate week start and get week key
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 0 });
  const weekKey = format(weekStart, 'yyyy-MM-dd');

  // Load schedule from database when week changes
  useEffect(() => {
    const existingSchedule = schedules.find(s => s.weekKey === weekKey);
    
    if (existingSchedule) {
      // Load from database
      const { week_start, week_key, ...scheduleData } = existingSchedule.days || {};
      setLocalSchedule(scheduleData);
      setHasUnsavedChanges(false);
      setIsDirty(false);
    } else {
      // Initialize empty schedule for new week
      const emptySchedule = {};
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayKey = format(day, 'yyyy-MM-dd');
        emptySchedule[dayKey] = {
          shifts: []
        };
      }
      setLocalSchedule(emptySchedule);
      setHasUnsavedChanges(false);
      setIsDirty(false);
    }
  }, [selectedWeek, schedules, weekKey]);

  // Update local schedule and mark as dirty
  const updateLocalSchedule = useCallback((updates) => {
    setLocalSchedule(prev => {
      const newSchedule = typeof updates === 'function' ? updates(prev) : updates;
      return newSchedule;
    });
    setHasUnsavedChanges(true);
    setIsDirty(true);
  }, []);

  // Clear all assignments in local schedule
  const clearLocalAssignments = useCallback(() => {
    setLocalSchedule(prev => {
      const clearedSchedule = {};
      Object.keys(prev).forEach(dayKey => {
        clearedSchedule[dayKey] = {
          ...prev[dayKey],
          shifts: prev[dayKey]?.shifts?.map(shift => ({
            ...shift,
            assignedStaff: {}
          })) || []
        };
      });
      return clearedSchedule;
    });
    setHasUnsavedChanges(true);
    setIsDirty(true);
  }, []);

  // Mark as saved (called after successful database save)
  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
    setIsDirty(false);
  }, []);

  // Reset to database state (called on cancel or reload)
  const resetToDatabase = useCallback(() => {
    const existingSchedule = schedules.find(s => s.weekKey === weekKey);
    if (existingSchedule) {
      const { week_start, week_key, ...scheduleData } = existingSchedule.days || {};
      setLocalSchedule(scheduleData);
    } else {
      const emptySchedule = {};
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayKey = format(day, 'yyyy-MM-dd');
        emptySchedule[dayKey] = { shifts: [] };
      }
      setLocalSchedule(emptySchedule);
    }
    setHasUnsavedChanges(false);
    setIsDirty(false);
  }, [schedules, weekKey, weekStart]);

  return {
    localSchedule,
    hasUnsavedChanges,
    isDirty,
    updateLocalSchedule,
    clearLocalAssignments,
    markAsSaved,
    resetToDatabase,
    weekKey
  };
};

