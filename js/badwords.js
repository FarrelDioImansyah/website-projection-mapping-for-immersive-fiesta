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
 * Menyensor kata-kata kasar dalam teks menjadi tanda bintang (misal: "anjing" -> "******")
 * 
 * @param {string} text - Teks input
 * @returns {string} - Teks yang sudah disensor dengan bintang-bintang
 */
function censorBadWords(text) {
    if (!text || typeof text !== 'string') return '';
    let result = text;

    for (const word of BAD_WORDS) {
        const trimmed = word.trim();
        if (!trimmed) continue;

        // Ganti kata kasar (case-insensitive) dengan jumlah bintang (*) sesuai panjang kata
        const regex = new RegExp(trimmed, 'gi');
        result = result.replace(regex, (match) => '*'.repeat(match.length));
    }

    return result;
}

