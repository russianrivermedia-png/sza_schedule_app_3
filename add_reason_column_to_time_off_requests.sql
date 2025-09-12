-- Add reason column to time_off_requests table if it doesn't exist
-- This script ensures the reason column exists for time off requests

-- Check if the reason column exists, and add it if it doesn't
DO $$ 
BEGIN
    -- Add reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_off_requests' 
        AND column_name = 'reason'
    ) THEN
        ALTER TABLE time_off_requests ADD COLUMN reason TEXT;
        RAISE NOTICE 'Added reason column to time_off_requests table';
    ELSE
        RAISE NOTICE 'reason column already exists in time_off_requests table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'time_off_requests' 
ORDER BY ordinal_position;
