-- ============================================
-- YuMe Media Storage Setup
-- ============================================
-- Run this script in your Supabase SQL Editor
-- to create the media storage bucket and tables

-- ============================================
-- 1. Create Storage Bucket
-- ============================================
-- Note: You can also create this via the Supabase Dashboard:
-- Storage → New Bucket → Name: "media" → Public: Yes

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Create Media Items Table
-- ============================================
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  public_url TEXT NOT NULL, -- Full public URL
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image' or 'video'
  mime_type TEXT NOT NULL, -- e.g., 'image/jpeg', 'video/mp4'
  file_size BIGINT, -- Size in bytes

  -- User metadata
  description TEXT,
  location TEXT,
  taken_date DATE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Create Media Comments Table
-- ============================================
CREATE TABLE IF NOT EXISTS media_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. Create Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_media_items_file_type ON media_items(file_type);
CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_comments_media_id ON media_comments(media_id);

-- ============================================
-- 5. Enable Row Level Security
-- ============================================
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_comments ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (for personal app)
CREATE POLICY "Allow all operations on media_items" ON media_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on media_comments" ON media_comments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 6. Storage Policies
-- ============================================
-- Allow public read access to media bucket
CREATE POLICY "Public read access to media bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow public insert to media bucket
CREATE POLICY "Public insert to media bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media');

-- Allow public update to media bucket
CREATE POLICY "Public update to media bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');

-- Allow public delete from media bucket
CREATE POLICY "Public delete from media bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'media');

-- ============================================
-- 7. Update Triggers
-- ============================================
-- Create trigger for media_items updated_at
CREATE TRIGGER update_media_items_updated_at
  BEFORE UPDATE ON media_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for media_comments updated_at
CREATE TRIGGER update_media_comments_updated_at
  BEFORE UPDATE ON media_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Done! Your media storage is ready to use.
