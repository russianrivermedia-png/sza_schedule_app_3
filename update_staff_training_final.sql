-- Update John Smith - Guide, Driver, Ground Support
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 5
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- Update Sarah Johnson - Guide, Assistant
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001'::uuid, '660e8400-e29b-41d4-a716-446655440005'::uuid],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 4
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

-- Update Mike Davis - Guide, Driver
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 6
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

-- Update Emily Wilson - Guide, Ground Support
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 5
WHERE id = '550e8400-e29b-41d4-a716-446655440004';

-- Update David Brown - Guide, Driver, Ground Support
UPDATE staff SET 
  trained_roles = ARRAY['660e8400-e29b-41d4-a716-446655440001'::uuid, '660e8400-e29b-41d4-a716-446655440002'::uuid, '660e8400-e29b-41d4-a716-446655440003'::uuid],
  availability = ARRAY['Friday', 'Saturday'],
  target_shifts = 5
WHERE id = '550e8400-e29b-41d4-a716-446655440005';
