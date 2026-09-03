/**
 * build.js
 * ========
 * Script ini digunakan saat deployment ke Vercel (npm run build).
 * Menghasilkan file js/env.js secara dinamis menggunakan Environment Variables dari Vercel.
 */

const fs = require('fs');
const path = require('path');

// Helper untuk membaca .env jika tersedia (saat build lokal)
let localEnv = {};
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim();
                localEnv[key] = val;
            }
        }
    });
}

// 1. Ambil env variables dari process.env (Vercel) atau fallback ke .env lokal
const SUPABASE_URL = process.env.SUPABASE_URL || localEnv.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || localEnv.SUPABASE_ANON_KEY || '';
const DB_TABLE = process.env.DB_TABLE || localEnv.DB_TABLE || 'pengunjung';
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || localEnv.STORAGE_BUCKET || 'foto-robot';

// 2. Format content file js/env.js
const fileContent = `/**
 * env.js — Environment Variables (Auto-Generated during build)
 * =============================================================
 */
const ENV = {
    SUPABASE_URL:      "${SUPABASE_URL}",
    SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}",
    DB_TABLE:          "${DB_TABLE}",
    STORAGE_BUCKET:    "${STORAGE_BUCKET}",
};
`;

// 3. Pastikan folder js/ ada, lalu tulis filenya
const targetDir = path.join(__dirname, 'js');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
}

const targetPath = path.join(targetDir, 'env.js');
fs.writeFileSync(targetPath, fileContent, 'utf8');

console.log('✅ File js/env.js berhasil digenerate!');

