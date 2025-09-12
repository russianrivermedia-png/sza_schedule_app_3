-- Create tables for shift swap and cover requests

-- Table for shift swap requests
CREATE TABLE IF NOT EXISTS shift_swap_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL,
    shift_date DATE NOT NULL,
    shift_name TEXT NOT NULL,
    shift_role TEXT NOT NULL,
    shift_time TEXT NOT NULL,
    reason TEXT NOT NULL,
    preferred_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    accepted_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for shift cover requests
CREATE TABLE IF NOT EXISTS shift_cover_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL,
    shift_date DATE NOT NULL,
    shift_name TEXT NOT NULL,
    shift_role TEXT NOT NULL,
    shift_time TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    accepted_by UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_requester ON shift_swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_status ON shift_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_shift_date ON shift_swap_requests(shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_created_at ON shift_swap_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_shift_cover_requests_requester ON shift_cover_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_shift_cover_requests_status ON shift_cover_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_cover_requests_shift_date ON shift_cover_requests(shift_date);
CREATE INDEX IF NOT EXISTS idx_shift_cover_requests_created_at ON shift_cover_requests(created_at);

-- Add RLS policies (Row Level Security)
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_cover_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own requests and requests they can accept
CREATE POLICY "Users can view swap requests" ON shift_swap_requests
    FOR SELECT USING (
        requester_id = auth.uid()::text::uuid OR 
        accepted_by = auth.uid()::text::uuid OR
        preferred_staff_id = auth.uid()::text::uuid
    );

CREATE POLICY "Users can view cover requests" ON shift_cover_requests
    FOR SELECT USING (
        requester_id = auth.uid()::text::uuid OR 
        accepted_by = auth.uid()::text::uuid
    );

-- Policy: Users can insert their own requests
CREATE POLICY "Users can create swap requests" ON shift_swap_requests
    FOR INSERT WITH CHECK (requester_id = auth.uid()::text::uuid);

CREATE POLICY "Users can create cover requests" ON shift_cover_requests
    FOR INSERT WITH CHECK (requester_id = auth.uid()::text::uuid);

-- Policy: Users can update their own requests or accept others' requests
CREATE POLICY "Users can update swap requests" ON shift_swap_requests
    FOR UPDATE USING (
        requester_id = auth.uid()::text::uuid OR 
        accepted_by = auth.uid()::text::uuid OR
        preferred_staff_id = auth.uid()::text::uuid
    );

CREATE POLICY "Users can update cover requests" ON shift_cover_requests
    FOR UPDATE USING (
        requester_id = auth.uid()::text::uuid OR 
        accepted_by = auth.uid()::text::uuid
    );
