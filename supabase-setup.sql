-- ============================================
-- YuMe Map Locations Table Setup
-- ============================================
-- Run this script in your Supabase SQL Editor
-- to create the map_locations table

-- Create the map_locations table
CREATE TABLE IF NOT EXISTS map_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('visited', 'wishlist')),
  visit_date TEXT,
  country_code TEXT,
  country_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_map_locations_type ON map_locations(type);
CREATE INDEX IF NOT EXISTS idx_map_locations_country_code ON map_locations(country_code);
CREATE INDEX IF NOT EXISTS idx_map_locations_created_at ON map_locations(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE map_locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth needs)
-- For a personal app with no auth, allow all operations
CREATE POLICY "Allow all operations on map_locations" ON map_locations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: If you want to add auth later, replace the above policy with:
-- CREATE POLICY "Users can manage their own locations" ON map_locations
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
-- (You would need to add a user_id column for this)

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to call the function
CREATE TRIGGER update_map_locations_updated_at
  BEFORE UPDATE ON map_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Done! Your map_locations table is ready to use.
