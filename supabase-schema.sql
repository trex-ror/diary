-- ============================================================
-- Diary With You — Supabase SQL Schema
-- Paste ini di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- MIGRATION: RUN THESE TWO LINES IF UPDATING FROM PREVIOUS VERSION
ALTER TABLE items ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Caveat';
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_template_check;

-- 1. Tabel PAGES (setiap halaman diary)
CREATE TABLE IF NOT EXISTS pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_number INT  NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel ITEMS (foto/video/note di setiap halaman)
CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('photo', 'video', 'note')),
  file_url    TEXT,
  template    TEXT DEFAULT 'polaroid',
  font_family TEXT DEFAULT 'Caveat',
  x           FLOAT NOT NULL DEFAULT 10,
  y           FLOAT NOT NULL DEFAULT 10,
  rotation    FLOAT NOT NULL DEFAULT 0,
  width       FLOAT NOT NULL DEFAULT 40,
  caption     TEXT DEFAULT '',
  note_text   TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_items_page_id ON items(page_id);
CREATE INDEX IF NOT EXISTS idx_pages_number  ON pages(page_number);

-- 4. RLS (Row Level Security)
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa READ (untuk viewer)
CREATE POLICY "Public read pages"  ON pages FOR SELECT USING (true);
CREATE POLICY "Public read items"  ON items FOR SELECT USING (true);

-- Semua orang bisa INSERT (keamanan dijaga oleh PIN di frontend)
CREATE POLICY "Public insert pages" ON pages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert items" ON items FOR INSERT WITH CHECK (true);

-- Semua orang bisa UPDATE dan DELETE items (keamanan dijaga oleh PIN di frontend)
CREATE POLICY "Public update items" ON items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete items" ON items FOR DELETE USING (true);

-- 5. Storage Bucket — jalankan di SQL Editor
-- PENTING: Buat bucket "diary-media" dulu di:
-- Storage → New Bucket → Name: diary-media → Public: ON
-- Lalu jalankan policy di bawah ini:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diary-media',
  'diary-media',
  true,
  10485760,  -- 10 MB limit
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm']
) ON CONFLICT (id) DO NOTHING;

-- Policy storage: semua orang bisa upload (keamanan dijaga PIN di frontend)
CREATE POLICY "Public upload diary-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'diary-media');

-- Policy storage: semua orang bisa baca file publik
CREATE POLICY "Public read diary-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'diary-media');

-- Policy storage: semua orang bisa hapus file publik (untuk cleanup saat edit)
CREATE POLICY "Public delete diary-media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'diary-media');

