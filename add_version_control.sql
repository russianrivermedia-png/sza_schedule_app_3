-- Add version control and locking to schedules table
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS last_modified_by TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS locked_by TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_schedules_version ON schedules(version);
CREATE INDEX IF NOT EXISTS idx_schedules_locked ON schedules(is_locked, locked_by);

-- Update existing schedules to have version 1
UPDATE schedules SET version = 1 WHERE version IS NULL;
UPDATE schedules SET last_modified_at = NOW() WHERE last_modified_at IS NULL;
