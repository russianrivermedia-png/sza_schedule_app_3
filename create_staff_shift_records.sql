-- Create staff shift records table for tracking actual worked shifts
-- This table records shifts only after the date has passed to account for coverage/switches

CREATE TABLE IF NOT EXISTS staff_shift_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  shift_name TEXT NOT NULL,
  shift_date DATE NOT NULL,
  week_key TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  arrival_time TIME,
  departure_time TIME,
  tours TEXT[], -- Array of tour IDs worked
  notes TEXT,
  is_coverage BOOLEAN DEFAULT FALSE, -- True if this was a coverage/switch
  original_staff_id UUID REFERENCES staff(id), -- If coverage, who was originally assigned
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by TEXT, -- Who recorded this shift (system, manager, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_shift_records_staff_id ON staff_shift_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_records_shift_date ON staff_shift_records(shift_date);
CREATE INDEX IF NOT EXISTS idx_staff_shift_records_week_key ON staff_shift_records(week_key);
CREATE INDEX IF NOT EXISTS idx_staff_shift_records_role_name ON staff_shift_records(role_name);
CREATE INDEX IF NOT EXISTS idx_staff_shift_records_recorded_at ON staff_shift_records(recorded_at);

-- Disable RLS for now (can be enabled later for security)
ALTER TABLE staff_shift_records DISABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE staff_shift_records IS 'Records actual worked shifts for staff members, only populated after shift date has passed';
COMMENT ON COLUMN staff_shift_records.is_coverage IS 'True if this shift was worked as coverage for another staff member';
COMMENT ON COLUMN staff_shift_records.original_staff_id IS 'If coverage, references the originally assigned staff member';
COMMENT ON COLUMN staff_shift_records.recorded_by IS 'Who recorded this shift: system (auto), manager name, or staff member';
