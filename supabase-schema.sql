-- ============================================================
-- Diary With You — Supabase SQL Schema
-- Paste ini di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

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
  file_url    TEXT,                   -- URL dari Supabase Storage (untuk photo/video)
  template    TEXT DEFAULT 'polaroid' CHECK (template IN ('polaroid', 'taped', 'vintage', 'plain')),
  x           FLOAT NOT NULL DEFAULT 10,   -- posisi X dalam %
  y           FLOAT NOT NULL DEFAULT 10,   -- posisi Y dalam %
  rotation    FLOAT NOT NULL DEFAULT 0,    -- rotasi dalam derajat
  width       FLOAT NOT NULL DEFAULT 40,   -- lebar dalam %
  caption     TEXT DEFAULT '',
  note_text   TEXT DEFAULT '',             -- isi catatan (untuk type=note)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_items_page_id ON items(page_id);
CREATE INDEX IF NOT EXISTS idx_pages_number  ON pages(page_number);

-- 4. Storage Bucket (jalankan terpisah setelah tabel dibuat)
-- Di Supabase Dashboard → Storage → New Bucket
-- Name: "diary-media"
-- Public: true
-- File size limit: 10MB
-- Allowed MIME types: image/*, video/mp4, video/webm

-- 5. RLS (Row Level Security) — buat data bisa dibaca publik
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pages" ON pages FOR SELECT USING (true);
CREATE POLICY "Public read items" ON items FOR SELECT USING (true);

-- Untuk INSERT/UPDATE, kita gunakan service role key di server side
-- sehingga hanya editor (dengan PIN) yang bisa menulis.
