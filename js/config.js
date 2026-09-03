/**
 * config.js — Backend Configuration
 * ===================================
 * Inisialisasi Supabase Client menggunakan variabel dari ENV
 * yang didefinisikan di js/env.js (gitignored).
 *
 * Load order di index.html:
 *   1. supabase CDN
 *   2. js/env.js      ← mendefinisikan const ENV
 *   3. js/config.js   ← membaca ENV, init supabaseClient
 *   4. js/app.js      ← menggunakan supabaseClient, DB_TABLE, STORAGE_BUCKET
 */

// Validasi bahwa env.js sudah di-load
if (typeof ENV === 'undefined') {
    throw new Error(
        '[config.js] ENV tidak ditemukan!\n' +
        'Pastikan file js/env.js sudah ada dan di-load sebelum config.js.\n' +
        'Salin js/env.example.js → js/env.js dan isi kredensial Supabase kamu.'
    );
}

// === SUPABASE CLIENT ===
if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
    console.warn('[config.js] Kredensial Supabase di js/env.js belum diisi!');
}

let supabaseClient;
try {
    supabaseClient = supabase.createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
} catch (err) {
    console.error('[config.js] Gagal inisialisasi Supabase client:', err.message);
}

// === CONSTANTS (digunakan oleh app.js) ===
const DB_TABLE       = ENV.DB_TABLE || 'pengunjung';
const STORAGE_BUCKET = ENV.STORAGE_BUCKET || 'foto-robot';

