/**
 * badwords.js — Daftar Kata Terlarang (Filter Kata Kasar / Toxic) v2
 * ================================================================
 *
 * ⚠️ CATATAN PENTING:
 * Tidak ada filter berbasis wordlist yang 100% tanpa celah. Orang tetap bisa
 * bypass lewat gambar/screenshot, singkatan aneh yang belum terdaftar, atau
 * bahasa/dialek yang belum masuk daftar. File ini menutup celah-celah TEKNIS
 * paling umum (leetspeak, huruf berulang, spasi, homoglyph unicode), tapi
 * sebaiknya tetap dipasangkan dengan validasi di server (jangan hanya
 * mengandalkan filter client-side, karena JS di browser bisa dimatikan/diubah).
 *
 * 💡 CARA MENAMBAHKAN KATA BARU:
 * 1. Buka file ini (js/badwords.js).
 * 2. Tambahkan kata baru di dalam daftar BAD_WORDS di bawah (tulis dengan huruf kecil).
 * 3. Pisahkan dengan tanda koma (,).
 *
 * Contoh:
 *   'kata1',
 *   'kata2',
 *
 * 💡 CARA MENAMBAHKAN KATA AMAN (biar tidak salah tangkap / false positive):
 * Tambahkan ke daftar WHITELIST di bawah. Berguna untuk kata yang kebetulan
 * mengandung potongan huruf yang mirip kata terlarang, misalnya "asuransi"
 * (mengandung "asu") atau "pantai"/"santai" (mengandung "tai").
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
    'sex',

    // Tambahkan kata terlarang lainnya di sini...
];

/**
 * Kata-kata yang AMAN meskipun mengandung potongan huruf kata terlarang.
 * Dicek sebelum pencocokan "compact" (tanpa spasi) supaya tidak salah tangkap.
 * Tambahkan kata lain di sini kalau ketemu false positive baru.
 */
const WHITELIST = [
    'asuransi', 'asuh', 'asupan', 'terbiasa', 'biasa', 'asumsi',
    'pantai', 'santai', 'petai', 'retail', 'detail', 'portable',
    'pelita', 'pelihara', 'pelindung', 'pelipis', 'peluit', 'kepeli',
    'tetes', 'tetesan', 'tetangga', 'tetap', 'tetamu',
    'istilah', 'sextant', 'context', 'sussex', 'middlesex',
    // Tambahkan kata aman lainnya di sini...
];

/**
 * Kata penghinaan/ujaran kebencian bernuansa SARA (suku/agama/ras/golongan)
 * atau politik-identitas. PENTING: ini daftar ISTILAH PENGHINAAN yang dipakai
 * untuk MENYERANG kelompok tertentu — bukan nama suku/agama/kelompok itu
 * sendiri (nama kelompok TIDAK boleh diblokir, itu diskriminatif).
 * Tambahkan istilah penghinaan lain di sini sesuai kebutuhan acara.
 */
const HATE_WORDS = [
    'aseng',
    'cino',
    'kadrun',
    'cebong',
    'komunis', // sering dipakai sebagai tuduhan/hinaan, bukan istilah netral di caption publik
    'kafir',   // rawan dipakai menyerang, hati-hati potensi false positive pada diskusi agama yang sah
    // Tambahkan istilah penghinaan SARA/politik lain di sini...
];

/**
 * Kata yang mengindikasikan provokasi/ajakan kekerasan. Karena kata-kata ini
 * juga bisa muncul dalam konteks wajar (idiom, berita, dsb), sebaiknya JANGAN
 * auto-block permanen — lebih aman untuk auto-hold (tahan dulu, cek admin)
 * daripada auto-reject.
 */
const PROVOCATION_WORDS = [
    'bunuh',
    'bakar',
    'serang',
    'hancurkan',
    'basmi',
    'tumpas',
    'perang',
    'bom',
    'teroris',
    // Tambahkan kata provokasi lain di sini...
];

/**
 * Peta leetspeak (angka/simbol -> huruf).
 * Urutan penting: yang lebih spesifik taruh belakangan kalau ada bentrok.
 */
const LEET_MAP = {
    '4': 'a', '@': 'a', '^': 'a', 'д': 'a', 'а': 'a',
    '8': 'b', 'в': 'b',
    '(': 'c', '<': 'c', 'с': 'c',
    '3': 'e', '€': 'e', 'е': 'e', 'э': 'e',
    '6': 'g', '9': 'g',
    '1': 'i', '!': 'i', '|': 'i', '¡': 'i', 'і': 'i',
    '0': 'o', 'о': 'o',
    '5': 's', '$': 's',
    '7': 't', '+': 't', 'т': 't',
    'у': 'y',
    'х': 'x',
    'р': 'p',
    'н': 'n',
    'м': 'm',
    'к': 'k',
};

/**
 * Menghapus karakter zero-width / tak terlihat yang sering disisipkan
 * di antara huruf untuk mengelabui filter (mis. "a​n​j​i​n​g" pakai zero-width space).
 */
function stripInvisibleChars(text) {
    return text.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u00AD]/g, '');
}

/**
 * Mengganti karakter leetspeak/homoglyph menjadi huruf latin biasa.
 */
function applyLeetMap(text) {
    return text.replace(/./g, (ch) => LEET_MAP[ch] || ch);
}

/**
 * Meruntuhkan huruf yang diulang-ulang jadi satu (fuuuuck -> fuck, anjjjinggg -> anjing).
 * Batasnya 2x berturut-turut supaya kata sah seperti "lebah" atau "kaabah" tidak rusak parah.
 */
function collapseRepeats(text) {
    return text.replace(/(.)\1{2,}/g, '$1$1').replace(/(.)\1/g, (match, ch, offset, str) => {
        return match; // biarkan double letter wajar (contoh: "pass", "lebah")
    });
}

/**
 * Menghasilkan dua bentuk teks ternormalisasi:
 * - spaced  : simbol/spasi tetap jadi pemisah kata (dipakai untuk cek \b batas kata)
 * - compact : semua non a-z0-9 dibuang total (dipakai untuk menangkap kata yang
 *             sengaja dipisah spasi/simbol, misal "a n j i n g" atau "f.u.c.k")
 */
function normalize(text) {
    let t = stripInvisibleChars(text)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, ''); // buang diakritik (café -> cafe)

    t = applyLeetMap(t);

    // Kolaps huruf sama yang diulang lebih dari 2x (fuuuuck -> fuuck -> nanti match substring "fuck")
    t = t.replace(/(.)\1{2,}/g, '$1$1');
    // Kolaps sekali lagi jadi tunggal khusus untuk versi compact (biar "aanjjiing" -> "anjing")
    const singleCollapsed = t.replace(/(.)\1+/g, '$1');

    const spaced = t.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const compact = singleCollapsed.replace(/[^a-z0-9]/g, '');

    return { spaced, compact };
}

/**
 * Menghapus semua kemunculan kata whitelist dari teks compact,
 * supaya tidak memicu false positive pada pencocokan substring.
 */
function stripWhitelisted(compactText) {
    let result = compactText;
    for (const safe of WHITELIST) {
        const s = safe.trim().toLowerCase();
        if (!s) continue;
        result = result.split(s).join(' ');
    }
    return result;
}

/**
 * Memeriksa apakah teks mengandung kata-kata yang dilarang.
 * Mendukung deteksi leetspeak, homoglyph, huruf berulang, dan kata yang
 * sengaja dipisah spasi/simbol untuk menghindari filter.
 *
 * @param {string} text - Teks yang akan dicek (Nama atau Caption)
 * @param {object} [options]
 * @param {boolean} [options.detail=false] - Jika true, kembalikan detail kata yang cocok, bukan cuma boolean
 * @returns {boolean|{matched: boolean, words: string[]}}
 */
function containsBadWords(text, options = {}) {
    const { detail = false } = options;

    if (!text || typeof text !== 'string') {
        return detail ? { matched: false, words: [] } : false;
    }

    const { spaced, compact } = normalize(text);
    const compactSafe = stripWhitelisted(compact);

    const foundWords = new Set();

    for (const raw of BAD_WORDS) {
        const word = raw.trim().toLowerCase();
        if (!word) continue;

        // 1) Cek batas kata pada versi "spaced" (presisi tinggi, minim false positive)
        const boundaryRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
        if (boundaryRegex.test(spaced)) {
            foundWords.add(word);
            continue;
        }

        // 2) Cek substring pada versi "compact" (menangkap kata yang dipisah spasi/simbol)
        //    Kata sangat pendek (<=3 huruf) TIDAK dicek di sini untuk mencegah
        //    ledakan false positive dari kata umum yang mengandung 3 huruf itu.
        if (word.length >= 4 && compactSafe.includes(word)) {
            foundWords.add(word);
        }
    }

    if (detail) {
        return { matched: foundWords.size > 0, words: Array.from(foundWords) };
    }
    return foundWords.size > 0;
}

/**
 * Mengecek apakah daftar kata tertentu (mis. HATE_WORDS, PROVOCATION_WORDS)
 * muncul di teks. Logikanya sama seperti containsBadWords tapi dipakai
 * untuk daftar kata lain, supaya tidak duplikasi kode.
 */
function matchWordList(text, wordList) {
    const { spaced, compact } = normalize(text);
    const compactSafe = stripWhitelisted(compact);
    const found = new Set();

    for (const raw of wordList) {
        const word = raw.trim().toLowerCase();
        if (!word) continue;

        const boundaryRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
        if (boundaryRegex.test(spaced)) {
            found.add(word);
            continue;
        }
        if (word.length >= 4 && compactSafe.includes(word)) {
            found.add(word);
        }
    }
    return Array.from(found);
}

/**
 * Deteksi indikasi spam: URL, nomor telepon/WA, atau teks yang di-flood
 * (kata/karakter yang sama diulang berkali-kali). Berguna untuk caption
 * publik di projection mapping supaya tidak disalahgunakan untuk promosi.
 *
 * @param {string} text
 * @returns {{isSpam: boolean, reasons: string[]}}
 */
function detectSpam(text) {
    if (!text || typeof text !== 'string') return { isSpam: false, reasons: [] };

    const reasons = [];
    const t = text.toLowerCase();

    // URL / domain
    if (/(https?:\/\/|www\.|\.(com|net|id|org|xyz|info)\b)/i.test(t)) {
        reasons.push('url');
    }

    // Nomor telepon/WA Indonesia (08xxxxxxxxxx atau +62xxxxxxxxxx)
    if (/(\+?62|0)8[0-9]{8,12}/.test(t.replace(/[\s\-()]/g, ''))) {
        reasons.push('nomor_telepon');
    }

    // Kata/frasa yang sama diulang berkali-kali (mis. "beli beli beli beli murah murah murah")
    const words = t.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 6) {
        const freq = {};
        for (const w of words) freq[w] = (freq[w] || 0) + 1;
        const maxFreq = Math.max(...Object.values(freq));
        if (maxFreq / words.length > 0.5) reasons.push('flood_kata');
    }

    // Karakter tunggal diulang sangat banyak (mis. "aaaaaaaaaaaaaaaaaaaa")
    if (/(.)\1{9,}/.test(t)) reasons.push('flood_karakter');

    return { isSpam: reasons.length > 0, reasons };
}

/**
 * Fungsi moderasi gabungan — satu pintu untuk cek semua kategori sekaligus.
 * Cocok dipanggil sebelum caption ditampilkan di layar projection mapping.
 *
 * @param {string} text
 * @returns {{
 *   allow: boolean,
 *   action: 'reject' | 'hold' | 'allow',
 *   badWords: string[],
 *   hateWords: string[],
 *   provocationWords: string[],
 *   spam: {isSpam: boolean, reasons: string[]}
 * }}
 */
function moderateText(text) {
    const badResult = containsBadWords(text, { detail: true });
    const hateWords = matchWordList(text, HATE_WORDS);
    const provocationWords = matchWordList(text, PROVOCATION_WORDS);
    const spam = detectSpam(text);

    // Kata kasar / hate speech / spam -> langsung tolak otomatis
    if (badResult.matched || hateWords.length > 0 || spam.isSpam) {
        return {
            allow: false,
            action: 'reject',
            badWords: badResult.words,
            hateWords,
            provocationWords,
            spam,
        };
    }

    // Kata provokasi -> jangan auto-reject (rawan false positive/idiom),
    // tapi tahan dulu untuk direview admin sebelum tayang.
    if (provocationWords.length > 0) {
        return {
            allow: false,
            action: 'hold',
            badWords: [],
            hateWords: [],
            provocationWords,
            spam,
        };
    }

    return {
        allow: true,
        action: 'allow',
        badWords: [],
        hateWords: [],
        provocationWords: [],
        spam,
    };
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Untuk dipakai di Node.js (mis. validasi di server) sekaligus di browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        containsBadWords,
        moderateText,
        detectSpam,
        BAD_WORDS,
        HATE_WORDS,
        PROVOCATION_WORDS,
        WHITELIST,
    };
}
