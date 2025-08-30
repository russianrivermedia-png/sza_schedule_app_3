import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';

const DataContext = createContext();

const initialState = {
  staff: [],
  roles: [],
  shifts: [],
  tours: [],
  schedules: [],
  timeOffRequests: [],
  currentWeek: new Date(),
};

// Performance optimization: Create efficient lookup indexes
const createIndexes = (data) => {
  return {
    staffById: new Map(data.staff.map(s => [s.id, s])),
    rolesById: new Map(data.roles.map(r => [r.id, r])),
    shiftsById: new Map(data.shifts.map(s => [s.id, s])),
    toursById: new Map(data.tours.map(t => [t.id, t])),
    timeOffByStaff: data.timeOffRequests.reduce((acc, t) => {
      if (!acc[t.staffId]) acc[t.staffId] = [];
      acc[t.staffId].push(t);
      return acc;
    }, {}),
    schedulesByWeek: data.schedules.reduce((acc, s) => {
      acc[s.weekKey] = s;
      return acc;
    }, {})
  };
};

function dataReducer(state, action) {
  switch (action.type) {
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

// Debounce utility function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export function DataProvider({ children }) {
  // Load data from localStorage on mount
  const loadInitialState = () => {
    try {
      const savedData = localStorage.getItem('szaScheduleData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Merge saved data with initial state, ensuring all required fields exist
        return {
          ...initialState,
          ...parsed,
          // Ensure arrays exist and are valid
          staff: Array.isArray(parsed.staff) ? parsed.staff : [],
          roles: Array.isArray(parsed.roles) ? parsed.roles : [],
          shifts: Array.isArray(parsed.shifts) ? parsed.shifts : [],
          tours: Array.isArray(parsed.tours) ? parsed.tours : [],
          schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
          timeOffRequests: Array.isArray(parsed.timeOffRequests) ? parsed.timeOffRequests : [],
          currentWeek: parsed.currentWeek ? new Date(parsed.currentWeek) : new Date(),
        };
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    return initialState;
  };

  const [state, dispatch] = useReducer(dataReducer, loadInitialState());

  // Create memoized indexes for O(1) lookups
  const indexes = useMemo(() => createIndexes(state), [state]);

  // Debounced save function to prevent excessive localStorage writes
  const debouncedSave = useCallback(
    debounce((data) => {
      try {
        localStorage.setItem('szaScheduleData', JSON.stringify(data));
      } catch (error) {
        console.error('Error saving data to localStorage:', error);
      }
    }, 1000), // Save after 1 second of inactivity
    []
  );

  // Save data to localStorage whenever state changes (debounced)
  useEffect(() => {
    debouncedSave(state);
  }, [state, debouncedSave]);

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
