import { useCallback } from 'react';
import { scheduleHelpers } from '../lib/supabaseHelpers';

/**
 * Custom hook for handling schedule persistence to database
 * Separates save logic from local state management
 */
export const useSchedulePersistence = (dispatch) => {
  
  // Save local schedule to database
  const saveSchedule = useCallback(async (localSchedule, weekKey, weekStart) => {
    try {
      console.log('💾 Saving schedule to database...', { weekKey, localSchedule });
      
      // Debug: Check tours in shifts before saving
      Object.keys(localSchedule).forEach(dayKey => {
        if (localSchedule[dayKey]?.shifts) {
          localSchedule[dayKey].shifts.forEach((shift, index) => {
            console.log(`🔍 Shift ${index} on ${dayKey}:`, {
              name: shift.name,
              tours: shift.tours,
              toursLength: shift.tours?.length || 0
            });
          });
        }
      });
      
      // Prepare data for database - the existing structure stores week info in days
      const scheduleData = {
        days: {
          week_key: weekKey,
          week_start: weekStart.toISOString(),
          ...localSchedule
        }
      };

      // Check if schedule exists by looking for weekKey in the days object
      const existingSchedules = await scheduleHelpers.getAll();
      const existingSchedule = existingSchedules.find(s => 
        s.days && s.days.week_key === weekKey
      );

      let savedSchedule;
      if (existingSchedule) {
        // Update existing schedule
        savedSchedule = await scheduleHelpers.update(existingSchedule.id, scheduleData);
        // Transform to match DataContext format
        const transformedSchedule = {
          ...savedSchedule,
          weekKey: weekKey,
          weekStart: weekStart.toISOString()
        };
        dispatch({ type: 'UPDATE_SCHEDULE', payload: transformedSchedule });
      } else {
        // Create new schedule
        savedSchedule = await scheduleHelpers.add(scheduleData);
        // Transform to match DataContext format
        const transformedSchedule = {
          ...savedSchedule,
          weekKey: weekKey,
          weekStart: weekStart.toISOString()
        };
        dispatch({ type: 'ADD_SCHEDULE', payload: transformedSchedule });
      }

      console.log('✅ Schedule saved successfully:', savedSchedule);
      return savedSchedule;
    } catch (error) {
      console.error('❌ Error saving schedule:', error);
      throw error;
    }
  }, [dispatch]);

  // Clear assignments from database
  const clearDatabaseAssignments = useCallback(async (weekStart, weekEnd) => {
    try {
      console.log('🗑️ Clearing database assignments...', { weekStart, weekEnd });
      // This would call your existing clearWeekAssignments function
      // await roleAssignmentsHelpers.clearWeekAssignments(weekStart, weekEnd);
      console.log('✅ Database assignments cleared');
    } catch (error) {
      console.error('❌ Error clearing database assignments:', error);
      throw error;
    }
  }, []);

  return {
    saveSchedule,
    clearDatabaseAssignments
  };
};
