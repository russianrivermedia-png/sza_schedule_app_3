-- Create role_assignments table for tracking staff role assignments
CREATE TABLE IF NOT EXISTS role_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  shift_id TEXT,
  tour_id TEXT,
  week_key TEXT,
  assignment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_manual BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_assignments_staff_id ON role_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON role_assignments(role);
CREATE INDEX IF NOT EXISTS idx_role_assignments_week_key ON role_assignments(week_key);
CREATE INDEX IF NOT EXISTS idx_role_assignments_assignment_date ON role_assignments(assignment_date);

-- Disable RLS for now (can be enabled later for security)
ALTER TABLE role_assignments DISABLE ROW LEVEL SECURITY;
