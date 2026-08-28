/**
 * env.example.js — Template Environment Variables
 * =================================================
 * File ini adalah TEMPLATE dan AMAN untuk di-commit ke GitHub.
 *
 * Cara setup untuk developer baru:
 *  1. Salin file ini: cp js/env.example.js js/env.js
 *  2. Isi nilai SUPABASE_URL dan SUPABASE_ANON_KEY dengan
 *     kredensial project Supabase kamu
 *  3. Pastikan js/env.js sudah ada di .gitignore (sudah dikonfigurasi)
 *
 * Dapatkan kredensial dari:
 *  https://supabase.com/dashboard → [Project] → Settings → API
 */

// === SUPABASE CREDENTIALS ===
const ENV = {
    SUPABASE_URL:      "https://your-project-id.supabase.co",
    SUPABASE_ANON_KEY: "your_supabase_anon_key_here",
    DB_TABLE:          "pengunjung",
    STORAGE_BUCKET:    "foto-robot",
};
