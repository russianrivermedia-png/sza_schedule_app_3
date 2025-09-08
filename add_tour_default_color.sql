-- Add default color field to tours table
ALTER TABLE tours ADD COLUMN IF NOT EXISTS default_color TEXT DEFAULT 'default';

-- Update existing tours to have a default color
UPDATE tours SET default_color = 'default' WHERE default_color IS NULL;
