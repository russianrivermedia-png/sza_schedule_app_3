import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

const DataContext = createContext();

const initialState = {
  staff: [],
  roles: [],
  shifts: [],
  tours: [],
  schedules: [],
  timeOffRequests: [],
  currentWeek: new Date(),
  loading: true,
  error: null,
};

// Performance optimization: Create efficient lookup indexes
const createIndexes = (data) => {
  return {
    staffById: new Map(data.staff.map(s => [s.id, s])),
    rolesById: new Map(data.roles.map(r => [r.id, r])),
    shiftsById: new Map(data.shifts.map(s => [s.id, s])),
    toursById: new Map(data.tours.map(t => [t.id, t])),
    timeOffByStaff: data.timeOffRequests.reduce((acc, t) => {
      if (!acc[t.staff_id]) acc[t.staff_id] = [];
      acc[t.staff_id].push(t);
      return acc;
    }, {}),
    schedulesByWeek: data.schedules.reduce((acc, s) => {
      acc[s.week_start] = s;
      return acc;
    }, {})
  };
};

function dataReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_STAFF':
      return { ...state, staff: action.payload };
    case 'ADD_STAFF':
      return { ...state, staff: [...state.staff, action.payload] };
    case 'UPDATE_STAFF':
      return {
        ...state,
        staff: state.staff.map(s => s.id === action.payload.id ? action.payload : s)
      };
    case 'DELETE_STAFF':
      return {
        ...state,
        staff: state.staff.filter(s => s.id !== action.payload)
      };
    case 'SET_ROLES':
      return { ...state, roles: action.payload };
    case 'ADD_ROLE':
      return { ...state, roles: [...state.roles, action.payload] };
    case 'UPDATE_ROLE':
      return {
        ...state,
        roles: state.roles.map(r => r.id === action.payload.id ? action.payload : r)
      };
    case 'DELETE_ROLE':
      return {
        ...state,
        roles: state.roles.filter(r => r.id !== action.payload)
      };
    case 'SET_SHIFTS':
      return { ...state, shifts: action.payload };
    case 'ADD_SHIFT':
      return { ...state, shifts: [...state.shifts, action.payload] };
    case 'UPDATE_SHIFT':
      return {
        ...state,
        shifts: state.shifts.map(s => s.id === action.payload.id ? action.payload : s)
      };
    case 'DELETE_SHIFT':
      return {
        ...state,
        shifts: state.shifts.filter(s => s.id !== action.payload)
      };
    case 'SET_TOURS':
      return { ...state, tours: action.payload };
    case 'ADD_TOUR':
      return { ...state, tours: [...state.tours, action.payload] };
    case 'UPDATE_TOUR':
      return {
        ...state,
        tours: state.tours.map(t => t.id === action.payload.id ? action.payload : t)
      };
    case 'DELETE_TOUR':
      return {
        ...state,
        tours: state.tours.filter(t => t.id !== action.payload)
      };
    case 'SET_SCHEDULES':
      return { ...state, schedules: action.payload };
    case 'ADD_SCHEDULE':
      return { ...state, schedules: [...state.schedules, action.payload] };
    case 'UPDATE_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.map(s => s.id === action.payload.id ? action.payload : s)
      };
    case 'DELETE_SCHEDULE':
      return {
        ...state,
        schedules: state.schedules.filter(s => s.id !== action.payload)
      };
    case 'SET_TIME_OFF_REQUESTS':
      return { ...state, timeOffRequests: action.payload };
    case 'ADD_TIME_OFF_REQUEST':
      return { ...state, timeOffRequests: [...state.timeOffRequests, action.payload] };
    case 'UPDATE_TIME_OFF_REQUEST':
      return {
        ...state,
        timeOffRequests: state.timeOffRequests.map(t => t.id === action.payload.id ? action.payload : t)
      };
    case 'DELETE_TIME_OFF_REQUEST':
      return {
        ...state,
        timeOffRequests: state.timeOffRequests.filter(t => t.id !== action.payload)
      };
    case 'SET_CURRENT_WEEK':
      return { ...state, currentWeek: action.payload };
    case 'UPDATE_STAFF_SHIFT_COUNT':
      return {
        ...state,
        staff: state.staff.map(s =>
          s.id === action.payload.staffId
            ? {
                ...s,
                shiftCount: (s.shiftCount || 0) + 1,
                roleCounts: {
                  ...s.roleCounts,
                  [action.payload.roleId]: (s.roleCounts?.[action.payload.roleId] || 0) + 1
                }
              }
            : s
        )
      };
    default:
      return state;
  }
}

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialState);

  // Create memoized indexes for O(1) lookups
  const indexes = useMemo(() => createIndexes(state), [state]);

  // Load data from Supabase on mount
  const loadData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Load all data in parallel
      const [staffResult, rolesResult, shiftsResult, toursResult, schedulesResult, timeOffResult] = await Promise.all([
        supabase.from('staff').select('*'),
        supabase.from('roles').select('*'),
        supabase.from('shifts').select('*'),
        supabase.from('tours').select('*'),
        supabase.from('schedules').select('*'),
        supabase.from('time_off_requests').select('*'),
      ]);

      // Check for errors
      if (staffResult.error) throw staffResult.error;
      if (rolesResult.error) throw rolesResult.error;
      if (shiftsResult.error) throw shiftsResult.error;
      if (toursResult.error) throw toursResult.error;
      if (schedulesResult.error) throw schedulesResult.error;
      if (timeOffResult.error) throw timeOffResult.error;

      // Dispatch data
      dispatch({ type: 'SET_STAFF', payload: staffResult.data || [] });
      dispatch({ type: 'SET_ROLES', payload: rolesResult.data || [] });
      dispatch({ type: 'SET_SHIFTS', payload: shiftsResult.data || [] });
      dispatch({ type: 'SET_TOURS', payload: toursResult.data || [] });
      // Transform schedules data to include weekKey for compatibility
      const transformedSchedules = (schedulesResult.data || []).map(schedule => ({
        ...schedule,
        weekKey: format(new Date(schedule.week_start), 'yyyy-MM-dd')
      }));
      dispatch({ type: 'SET_SCHEDULES', payload: transformedSchedules });
      dispatch({ type: 'SET_TIME_OFF_REQUESTS', payload: timeOffResult.data || [] });

      } catch (error) {
      console.error('Error loading data:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time subscriptions
  useEffect(() => {
    const subscriptions = [
      supabase.channel('staff').on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_STAFF', payload: payload.new });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_STAFF', payload: payload.new });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_STAFF', payload: payload.old.id });
        }
      }).subscribe(),

      supabase.channel('roles').on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_ROLE', payload: payload.new });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_ROLE', payload: payload.new });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_ROLE', payload: payload.old.id });
        }
      }).subscribe(),

      supabase.channel('shifts').on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_SHIFT', payload: payload.new });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_SHIFT', payload: payload.new });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_SHIFT', payload: payload.old.id });
        }
      }).subscribe(),

      supabase.channel('tours').on('postgres_changes', { event: '*', schema: 'public', table: 'tours' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_TOUR', payload: payload.new });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_TOUR', payload: payload.new });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_TOUR', payload: payload.old.id });
        }
      }).subscribe(),

      supabase.channel('schedules').on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const transformedSchedule = {
            ...payload.new,
            weekKey: format(new Date(payload.new.week_start), 'yyyy-MM-dd')
          };
          dispatch({ type: 'ADD_SCHEDULE', payload: transformedSchedule });
        } else if (payload.eventType === 'UPDATE') {
          const transformedSchedule = {
            ...payload.new,
            weekKey: format(new Date(payload.new.week_start), 'yyyy-MM-dd')
          };
          dispatch({ type: 'UPDATE_SCHEDULE', payload: transformedSchedule });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_SCHEDULE', payload: payload.old.id });
        }
      }).subscribe(),

      supabase.channel('time_off_requests').on('postgres_changes', { event: '*', schema: 'public', table: 'time_off_requests' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'ADD_TIME_OFF_REQUEST', payload: payload.new });
        } else if (payload.eventType === 'UPDATE') {
          dispatch({ type: 'UPDATE_TIME_OFF_REQUEST', payload: payload.new });
        } else if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_TIME_OFF_REQUEST', payload: payload.old.id });
        }
      }).subscribe(),
    ];

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, []);

  const value = {
    ...state,
    dispatch,
    // Expose indexes for efficient lookups
    indexes,
    // Helper functions for common operations
    getStaffById: (id) => indexes.staffById.get(id),
    getRoleById: (id) => indexes.rolesById.get(id),
    getShiftById: (id) => indexes.shiftsById.get(id),
    getTourById: (id) => indexes.toursById.get(id),
    getTimeOffByStaffId: (staffId) => indexes.timeOffByStaff[staffId] || [],
    getScheduleByWeek: (weekKey) => indexes.schedulesByWeek[weekKey],
    hasData: state.staff.length > 0 || state.roles.length > 0 || state.shifts.length > 0 || state.tours.length > 0,
    // Supabase functions
    supabase,
    loadData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
