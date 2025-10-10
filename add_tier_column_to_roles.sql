-- Add tier column to roles table for priority-based auto-assignment
-- Tier 1 = Highest priority (assigned first)
-- Tier 2 = Medium priority 
-- Tier 3 = Lowest priority (assigned last)

-- Add tier column if it doesn't exist
DO $$ 
BEGIN
    -- Add tier column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'tier') THEN
        ALTER TABLE roles ADD COLUMN tier INTEGER DEFAULT 1 NOT NULL;
    END IF;
END $$;

-- Update existing roles to have tier 1 as default
UPDATE roles SET tier = 1 WHERE tier IS NULL;

-- Add check constraint to ensure tier is between 1 and 3
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'roles_tier_check'
    ) THEN
        ALTER TABLE roles ADD CONSTRAINT roles_tier_check CHECK (tier >= 1 AND tier <= 3);
    END IF;
END $$;

-- Add index for better performance on tier-based queries
CREATE INDEX IF NOT EXISTS idx_roles_tier ON roles(tier);

-- Add comment to document the tier system
COMMENT ON COLUMN roles.tier IS 'Priority tier for auto-assignment: 1=highest, 2=medium, 3=lowest';

