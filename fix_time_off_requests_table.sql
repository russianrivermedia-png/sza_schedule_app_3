-- Fix time_off_requests table to ensure all required columns exist
-- This script adds any missing columns that are needed for the time off request functionality

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

    -- Add type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_off_requests' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE time_off_requests ADD COLUMN type TEXT DEFAULT 'vacation';
        RAISE NOTICE 'Added type column to time_off_requests table';
    ELSE
        RAISE NOTICE 'type column already exists in time_off_requests table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'time_off_requests' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE time_off_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to time_off_requests table';
    ELSE
        RAISE NOTICE 'created_at column already exists in time_off_requests table';
    END IF;

    -- Update existing records to have default values where needed
    UPDATE time_off_requests 
    SET type = 'vacation' 
    WHERE type IS NULL;

    UPDATE time_off_requests 
    SET status = 'pending' 
    WHERE status IS NULL;

    RAISE NOTICE 'Updated existing records with default values';
END $$;

-- Verify all columns exist and show the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'time_off_requests' 
ORDER BY ordinal_position;
