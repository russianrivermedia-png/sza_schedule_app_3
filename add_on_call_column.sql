-- Add on_call column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS on_call BOOLEAN DEFAULT FALSE;

-- Update existing staff to have on_call = false
UPDATE staff SET on_call = FALSE WHERE on_call IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_on_call ON staff(on_call);
