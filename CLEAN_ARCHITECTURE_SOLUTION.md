# 🏗️ Clean Architecture Solution for Schedule Builder

## **Current Problems**

1. **Mixed State Management**: Data scattered between local state and database
2. **Race Conditions**: Database updates happening during editing
3. **Data Inconsistency**: Local state and database can get out of sync
4. **Complex Synchronization**: Multiple sources of truth
5. **Clear Week Issues**: Not properly clearing local state

## **Proposed Solution: Local-First Architecture**

### **Core Principles**

1. **Local State as Single Source of Truth** during editing
2. **Database as Persistence Layer** only
3. **Clear Data Flow**: Database → Load → Local → Edit → Save → Database
4. **Explicit Save Operations** - no auto-saves during editing
5. **Dirty State Tracking** - know when changes need saving

### **Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Database      │    │   Local State    │    │      UI         │
│                 │    │                  │    │                 │
│ • Schedules     │◄──►│ • localSchedule  │◄──►│ • Schedule      │
│ • Staff         │    │ • hasUnsaved     │    │   Builder       │
│ • Roles         │    │ • isDirty        │    │ • Auto Assign   │
│ • Shifts        │    │                  │    │ • Clear Week    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        ▲                        ▲                        ▲
        │                        │                        │
        │                        │                        │
        └──────── Load ──────────┼──────── Edit ──────────┘
                                 │
                                 ▼
                            ┌──────────┐
                            │   Save   │
                            │ Function │
                            └──────────┘
```

### **Implementation Files**

1. **`src/hooks/useLocalSchedule.js`** - Local state management
2. **`src/hooks/useSchedulePersistence.js`** - Database operations
3. **`src/components/ScheduleBuilderTabClean.js`** - Clean UI component

### **Key Features**

#### **1. Local State Management**
```javascript
const {
  localSchedule,        // Current schedule data
  hasUnsavedChanges,    // Whether there are unsaved changes
  isDirty,             // Whether data has been modified
  updateLocalSchedule,  // Update local state
  clearLocalAssignments, // Clear all assignments
  markAsSaved,         // Mark as saved after DB update
  resetToDatabase      // Reset to database state
} = useLocalSchedule(selectedWeek, schedules);
```

#### **2. Clean Save Operations**
```javascript
const handleSave = async () => {
  if (!hasUnsavedChanges) return;
  
  try {
    setIsSaving(true);
    await saveSchedule(localSchedule, weekKey, weekStart);
    markAsSaved(); // Clear dirty flags
  } catch (error) {
    alert('Error saving: ' + error.message);
  } finally {
    setIsSaving(false);
  }
};
```

#### **3. Clear Week Function**
```javascript
const handleClearWeek = async () => {
  // 1. Clear local assignments
  clearLocalAssignments();
  
  // 2. Clear database assignments
  await clearDatabaseAssignments(weekStart, weekEnd);
  
  // 3. Save cleared state
  await saveSchedule(localSchedule, weekKey, weekStart);
  markAsSaved();
};
```

### **Benefits**

1. **Data Consistency**: Single source of truth during editing
2. **No Race Conditions**: Database only touched during explicit saves
3. **Clear State Management**: Always know if data is dirty/unsaved
4. **Better UX**: Clear save/reset/cancel operations
5. **Easier Debugging**: Clear separation of concerns
6. **Reliable Clear Week**: Properly clears both local and database state

### **Migration Strategy**

1. **Phase 1**: Implement new hooks alongside existing code
2. **Phase 2**: Create clean ScheduleBuilderTab component
3. **Phase 3**: Test with existing functionality
4. **Phase 4**: Replace old component
5. **Phase 5**: Remove old code

### **Usage Example**

```javascript
// In your component
const {
  localSchedule,
  hasUnsavedChanges,
  updateLocalSchedule,
  clearLocalAssignments,
  markAsSaved
} = useLocalSchedule(selectedWeek, schedules);

// Update a shift assignment
const assignStaff = (dayKey, shiftIndex, roleId, staffId) => {
  updateLocalSchedule(prev => ({
    ...prev,
    [dayKey]: {
      ...prev[dayKey],
      shifts: prev[dayKey].shifts.map((shift, i) => 
        i === shiftIndex 
          ? { ...shift, assignedStaff: { ...shift.assignedStaff, [roleId]: staffId } }
          : shift
      )
    }
  }));
};

// Save to database
const handleSave = async () => {
  await saveSchedule(localSchedule, weekKey, weekStart);
  markAsSaved();
};
```

### **Next Steps**

1. **Test the new hooks** with a simple component
2. **Implement auto-assignment** using local state
3. **Add drag-and-drop** functionality
4. **Replace existing ScheduleBuilderTab**
5. **Add auto-save** (optional) with user preference

This architecture provides a clean, maintainable solution that separates concerns and eliminates data consistency issues.

