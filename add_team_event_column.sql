-- Add team event column to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_team_event BOOLEAN DEFAULT FALSE;
UPDATE shifts SET is_team_event = FALSE WHERE is_team_event IS NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_team_event ON shifts(is_team_event);
