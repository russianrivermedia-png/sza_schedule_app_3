-- Add defaultStartingTime column to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS defaultStartingTime TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shifts_default_starting_time ON shifts(defaultStartingTime);

-- Update any existing shifts to have NULL defaultStartingTime (optional)
UPDATE shifts SET defaultStartingTime = NULL WHERE defaultStartingTime IS NULL;
