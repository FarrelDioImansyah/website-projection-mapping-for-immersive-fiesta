-- ====================================================================
-- SUPABASE SETUP SCRIPT — IMMERSIVE FIESTA 2026 (MODERASI ADMIN)
-- ====================================================================
-- Jalankan skrip SQL ini di menu "SQL Editor" pada Dashboard Supabase Anda.
-- ====================================================================

-- 1. Buat Tabel `pengunjung` (Jika Belum Ada)
CREATE TABLE IF NOT EXISTS public.pengunjung (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    nama TEXT NOT NULL,
    caption TEXT,
    image_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_flagged BOOLEAN DEFAULT FALSE
);

-- Jika tabel sudah pernah ada sebelumnya, jalankan ALTER TABLE berikut untuk menambahkan kolom moderasi:
ALTER TABLE public.pengunjung 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

-- 2. Buat Index untuk Performa Tinggi (Mempercepat query antrean Proyektor & Admin)
CREATE INDEX IF NOT EXISTS idx_pengunjung_status ON public.pengunjung(status);
CREATE INDEX IF NOT EXISTS idx_pengunjung_created_at ON public.pengunjung(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pengunjung_status_created ON public.pengunjung(status, created_at DESC);

-- 3. Aktifkan Supabase Realtime (Agar data pengunjung baru & perubahan status langsung terdeteksi tanpa refresh)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'pengunjung'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pengunjung;
    END IF;
END $$;

-- 4. Pengaturan Row Level Security (RLS) & Akses Anonim (Supabase Public Access)
ALTER TABLE public.pengunjung ENABLE ROW LEVEL SECURITY;

-- Policy: Izinkan pengunjung anonim mengirim foto (INSERT)
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.pengunjung;
CREATE POLICY "Allow anonymous insert" 
ON public.pengunjung 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Policy: Izinkan semua orang melihat data (SELECT)
DROP POLICY IF EXISTS "Allow public select" ON public.pengunjung;
CREATE POLICY "Allow public select" 
ON public.pengunjung 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Policy: Izinkan update status moderasi (UPDATE) dari Admin Dashboard
DROP POLICY IF EXISTS "Allow update status" ON public.pengunjung;
CREATE POLICY "Allow update status" 
ON public.pengunjung 
FOR UPDATE 
TO anon, authenticated 
USING (true);

-- Policy: Izinkan hapus data dari Admin Dashboard (DELETE)
DROP POLICY IF EXISTS "Allow delete entries" ON public.pengunjung;
CREATE POLICY "Allow delete entries" 
ON public.pengunjung 
FOR DELETE 
TO anon, authenticated 
USING (true);

-- 5. Pengaturan Storage Bucket (`foto-robot`) & Policy Upload
-- (Pastikan bucket 'foto-robot' sudah dibuat di menu Storage → New Bucket → Public)
-- SQL Policy untuk Storage Object Insert:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
        EXECUTE '
            DROP POLICY IF EXISTS "Allow anonymous storage insert" ON storage.objects;
            CREATE POLICY "Allow anonymous storage insert"
            ON storage.objects FOR INSERT
            TO anon, authenticated
            WITH CHECK (bucket_id = ''foto-robot'');

            DROP POLICY IF EXISTS "Allow public storage select" ON storage.objects;
            CREATE POLICY "Allow public storage select"
            ON storage.objects FOR SELECT
            TO anon, authenticated
            USING (bucket_id = ''foto-robot'');
        ';
    END IF;
END $$;
