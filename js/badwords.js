/**
 * badwords.js — Daftar Kata Terlarang (Filter Kata Kasar / Toxic)
 * ================================================================
 * 
 * 💡 CARA MENAMBAHKAN KATA BARU:
 * 1. Buka file ini (js/badwords.js).
 * 2. Tambahkan kata baru di dalam daftar BAD_WORDS di bawah (tulis dengan huruf kecil).
 * 3. Pisahkan dengan tanda koma (,).
 *
 * Contoh:
 *   'kata1',
 *   'kata2',
 */

const BAD_WORDS = [
    // --- Bahasa Indonesia ---
    'anjing',
    'babi',
    'bangsat',
    'kontol',
    'memek',
    'pantek',
    'pepek',
    'puki',
    'ngentot',
    'ngentod',
    'jembut',
    'itil',
    'pler',
    'tolol',
    'goblok',
    'idiot',
    'bego',
    'bajingan',
    'kampret',
    'tai',
    'taek',
    'asu',
    'jancok',
    'dancok',
    'ancok',
    'peli',
    'lonte',
    'tete',
    'tetek',
    'bokep',
    'porno',
    'titit',

    // --- Bahasa Inggris ---
    'fuck',
    'fucker',
    'fucking',
    'bitch',
    'asshole',
    'shit',
    'dick',
    'pussy',
    'cunt',
    'bastard',
    'whore',
    'slut',
    'nigger',
    'nigga',
    'nude',
    'porn',
    'sex'

    // Tambahkan kata terlarang lainnya di sini...
];

/**
 * Memeriksa apakah teks mengandung kata-kata yang dilarang.
 * Mendukung deteksi leetspeak sederhana (contoh: 4nj1ng -> anjing).
 * 
 * @param {string} text - Teks yang akan dicek (Nama atau Caption)
 * @returns {boolean} - true jika mengandung kata terlarang, false jika aman
 */
function containsBadWords(text) {
    if (!text || typeof text !== 'string') return false;

    // 1. Normalisasi karakter leetspeak (angka -> huruf)
    const normalized = text.toLowerCase()
        .replace(/[@4]/g, 'a')
        .replace(/[3]/g, 'e')
        .replace(/[1!|]/g, 'i')
        .replace(/[0]/g, 'o')
        .replace(/[5$]/g, 's')
        .replace(/[7]/g, 't')
        .replace(/[^a-z0-9\s]/g, ' ');

    // 2. Cek apakah ada kata yang cocok di dalam daftar BAD_WORDS
    for (const word of BAD_WORDS) {
        const trimmed = word.trim().toLowerCase();
        if (!trimmed) continue;

        // Cek pola kata penuh atau kemunculan dalam teks
        const regex = new RegExp(`\\b${trimmed}\\b`, 'i');
        if (regex.test(normalized) || normalized.includes(trimmed)) {
            return true;
        }
    }

    return false;
}
