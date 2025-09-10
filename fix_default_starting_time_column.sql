-- Fix defaultStartingTime column to use snake_case (default_starting_time)
-- First, add the new column with correct naming
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS default_starting_time TEXT;

-- Copy data from old column to new column if it exists
UPDATE shifts SET default_starting_time = defaultStartingTime WHERE defaultStartingTime IS NOT NULL;

-- Drop the old column if it exists
ALTER TABLE shifts DROP COLUMN IF EXISTS defaultStartingTime;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shifts_default_starting_time ON shifts(default_starting_time);

-- Update any existing shifts to have NULL default_starting_time (optional)
UPDATE shifts SET default_starting_time = NULL WHERE default_starting_time IS NULL;
