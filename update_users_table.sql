-- Add email field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Update existing users with placeholder emails if they don't have them
UPDATE users SET email = CONCAT(username, '@example.com') WHERE email IS NULL;

-- Make email field NOT NULL after updating existing records
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
