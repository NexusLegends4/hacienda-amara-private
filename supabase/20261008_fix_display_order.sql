-- Fix display_order for existing packages with 0
-- Run this in Supabase SQL Editor

-- Update existing packages with display_order = 0 to have sequential order
WITH ordered_packages AS (
  SELECT id, 
         ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_order
  FROM packages
  WHERE display_order = 0 OR display_order IS NULL
)
UPDATE packages p
SET display_order = op.new_order
FROM ordered_packages op
WHERE p.id = op.id;

-- For any remaining null values, set to max + 1
UPDATE packages 
SET display_order = (SELECT COALESCE(MAX(display_order), 0) + 1 FROM packages)
WHERE display_order IS NULL;