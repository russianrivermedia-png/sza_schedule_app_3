# SZA Schedule App

A comprehensive staff scheduling application built with React and Material-UI that helps manage staff, roles, shifts, and weekly schedules with intelligent conflict detection and auto-assignment capabilities.

## Features

### 🧑‍💼 Staff Management
- Add, edit, and delete staff members
- Store contact information (email, phone - optional)
- Set weekly availability (days of the week)
- Define trained roles for each staff member
- Set target shift count per week (default: 5)
- Track time off requests and availability status

### 🎭 Role Management
- Create and manage roles that staff can be trained for
- Add descriptions and details for each role
- Link roles to shift requirements

### ⏰ Shift Creation
- Define shift templates with required roles
- Support for shifts requiring 1-3 staff members
- Flexible role assignment system

### 🗓️ Schedule Builder
- Weekly schedule view with daily editing
- Drag-and-drop staff assignment to roles
- Real-time conflict detection and warnings:
  - Staff not available on specific days
  - Staff assigned to untrained roles
  - Exceeding target shift limits
  - Time off request conflicts
- Smart staff swapping when dropping on filled roles
- Auto-assign functionality with workload balancing
- Navigate between weeks easily

### 👀 Schedule Viewer
- Clean, organized view of weekly schedules
- Staff summary with shift counts and status
- Export schedules to Excel format
- Historical schedule tracking

### ⚠️ Conflict Management
- Visual warnings for all scheduling conflicts
- Option to override conflicts when needed
- Real-time validation during schedule building

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sza_schedule_app_2
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

### Building for Production

To create a production build:
```bash
npm run build
```

## Usage Guide

### 1. Set Up Your Team
Start by creating roles and adding staff members:
- **Roles Tab**: Create roles like "Cashier", "Manager", "Stock Clerk"
- **Staff Tab**: Add staff members with their availability and trained roles

### 2. Define Shifts
- **Shift Creation Tab**: Create shift templates (e.g., "Morning Shift", "Evening Shift")
- Specify how many and which roles are required for each shift

### 3. Build Schedules
- **Schedule Builder Tab**: Navigate to your desired week
- Add shifts to specific days
- Drag and drop staff members to fill required roles
- Use auto-assign for quick scheduling
- Save your schedule when complete

### 4. View and Export
- **Schedule Viewer Tab**: Review completed schedules
- Export to Excel for distribution
- Track staff workload and conflicts

## Data Persistence

The app automatically saves all data to your browser's localStorage. This means:
- Your data persists between browser sessions
- No server setup required
- Data is stored locally on your device

## Conflict Detection

The app automatically detects and warns about:
- **Availability Conflicts**: Staff assigned on unavailable days
- **Training Conflicts**: Staff assigned to untrained roles
- **Overload Conflicts**: Staff exceeding target shift limits
- **Time Off Conflicts**: Staff with approved time off requests

## Auto-Assign Features

The auto-assign function:
- Prioritizes staff with fewer current week shifts
- Respects availability and training requirements
- Balances workload across team members
- Avoids conflicts automatically

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Technology Stack

- **Frontend**: React 18
- **UI Framework**: Material-UI (MUI)
- **Drag & Drop**: React DnD
- **Date Handling**: date-fns
- **Excel Export**: SheetJS
- **State Management**: React Context + useReducer
- **Routing**: React Router

## Contributing

This is a custom application built for SZA. For modifications or improvements, please contact the development team.

## Support

For technical support or feature requests, please create an issue in the repository or contact the development team.

## License

This project is proprietary software developed for SZA. All rights reserved.
