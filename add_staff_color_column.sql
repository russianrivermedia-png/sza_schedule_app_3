-- Add staff_color column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_color TEXT DEFAULT 'gray';
