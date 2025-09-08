-- Update staff with trained roles and availability
-- This script assigns roles to staff members so they can be auto-assigned

-- Update John Smith - Guide, Driver, Ground Support
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003'],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 5
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- Update Sarah Johnson - Guide, Assistant
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005'],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 4
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

-- Update Mike Davis - Guide, Driver
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002'],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 6
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

-- Update Emily Wilson - Guide, Ground Support
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003'],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 5
WHERE id = '550e8400-e29b-41d4-a716-446655440004';

-- Update David Brown - Guide, Driver, Ground Support
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003'],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 5
WHERE id = '550e8400-e29b-41d4-a716-446655440005';
