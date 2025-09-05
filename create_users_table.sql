-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('staff', 'supervisor', 'manager')),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the 3 default user accounts
INSERT INTO users (username, password, role, name) VALUES
('staff', 'staff123', 'staff', 'Staff Member'),
('supervisor', 'supervisor123', 'supervisor', 'Supervisor'),
('manager', 'manager123', 'manager', 'Manager')
ON CONFLICT (username) DO NOTHING;

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
