# Role Assignment Tracking Feature

## Overview
This feature automatically tracks all role assignments for staff members, providing a comprehensive log and summary of their experience in different roles.

## Features

### 1. Automatic Logging
- **Every role assignment** in the Schedule Builder is automatically logged
- **Real-time tracking** of staff assignments to different roles
- **Week-based organization** for easy reference

### 2. Role Assignment Panel
- **Side panel** in Staff Management when editing a staff member
- **Activity log** showing chronological history of all role assignments
- **Role summary** with color-coded chips showing assignment counts
- **Manual adjustments** to add or remove role assignments

### 3. Database Structure
- **`role_assignments` table** stores all assignment records
- **Automatic timestamps** for when assignments were made
- **Manual vs automatic** tracking (manual entries vs schedule builder assignments)
- **Audit trail** showing who created each assignment

## Usage

### Viewing Role Assignments
1. Go to **Staff Management** tab
2. Click **Edit** on any staff member
3. The **Role Assignment History** panel appears on the right side
4. View:
   - **Role Summary**: Color-coded chips showing assignment counts
   - **Assignment Log**: Chronological list of all assignments
   - **Assignment Details**: Date, week, and source of each assignment

### Manual Adjustments
1. In the Role Assignment panel, click **"Add Role Assignment"**
2. Select the role and quantity
3. Add optional notes
4. Click **"Add Assignment(s)"**
5. To remove assignments, click the **delete icon** next to any log entry

### Automatic Tracking
- Role assignments are automatically logged when:
  - Staff are assigned to roles in the Schedule Builder
  - Auto-assignment feature is used
  - Manual drag-and-drop assignments are made

## Database Schema

```sql
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY,
  staff_id UUID REFERENCES staff(id),
  role TEXT NOT NULL,
  shift_id TEXT,
  tour_id TEXT,
  week_key TEXT,
  assignment_date TIMESTAMP WITH TIME ZONE,
  is_manual BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE
);
```

## Benefits

1. **Staff Development**: Track which staff members need more experience in specific roles
2. **Fair Distribution**: Ensure all staff get equal opportunities for different roles
3. **Training Planning**: Identify staff who need additional training for specific roles
4. **Historical Data**: Complete audit trail of all role assignments
5. **Manual Corrections**: Ability to adjust records for training, special events, or corrections

## Technical Implementation

- **Real-time logging** in ScheduleBuilderTab when staff are assigned
- **Supabase integration** for cloud storage and real-time updates
- **Optimized queries** for fast loading of assignment history
- **Error handling** to prevent assignment logging from breaking main functionality
- **Responsive UI** that works on all screen sizes

## Future Enhancements

- **Role-specific reports** showing distribution across all staff
- **Training recommendations** based on assignment history
- **Performance metrics** for role assignment efficiency
- **Export functionality** for role assignment data
- **Advanced filtering** and search capabilities
