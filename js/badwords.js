/**
 * badwords.js — Engine Filter Kata Terlarang (Badwords & Toxic Moderation) v3
 * =========================================================================
 *
 * 💡 FITUR ENGINE DETEKSI:
 * 1. Despacing otomatis untuk kata yang diselipi spasi/simbol (e.g. "a s u", "k o n t o l", "m.e.m.e.k", "f u c k").
 * 2. Normalisasi Leetspeak & Homoglyph Unicode (e.g. "k0nt1l", "4nj1ng", "m3m3k", "goblq").
 * 3. Pencocokan Imbuhan / Akhiran Indonesia (e.g. "asumu", "tainya", "anjingnya", "kontolers").
 * 4. Whitelist kata aman untuk mencegah false positive pada nama pengunjung (e.g. "Agus", "Budi", "Basuki", "Taufik", "Pantai", "Asuransi").
 */

const BAD_WORDS = [
    // --- Bahasa Indonesia & Slang Utama ---
    'anjing', 'anjg', 'anj', 'anjir', 'anjrit', 'anjrot', 'anjay', 'anjeng', 'anjinx', 'anjinq', 'anjink', 'anjingg',
    'babi', 'bb', 'bbq',
    'bangsat', 'bgst', 'bgsd', 'bajingan', 'bjngn', 'kampret', 'kmprt',
    'kontol', 'qontol', 'qontl', 'kntl', 'ktl', 'kn7l', 'k0nt0l', 'k0nt1l', 'kontil', 'kintil', 'kontolers', 'kontoler', 'kontl',
    'memek', 'memeq', 'mmk', 'm3m3k', 'm3m3q', 'pepek', 'ppk', 'puki', 'pukimak', 'pukima', 'kimak',
    'pantek', 'pntk', 'pntq', 'pante',
    'ngentot', 'ngentod', 'ng3nt0t', 'ng3ntod', 'ngent0t', 'ngewe', 'ngewet', 'ngw',
    'jembut', 'jmbt', 'itil', 'pler', 'peler', 'plr', 'pl3r', 'p1er', 'pier',
    'tolol', 'tll', 'goblok', 'gblk', 'goblog', 'goblq', 'goblk', 'bego', 'begok', 'dongo', 'dongok', 'pekok', 'idiot', 'autis', 'sarap', 'sinting',
    'tai', 'taek', 'taii', 'asu', 'asoe', 'asuu',
    'jancok', 'dancok', 'ancok', 'jancuk', 'dancuk', 'jancuq', 'dancuq', 'cok', 'cuk', 'coeg', 'jnck', 'janck', 'jncok', 'jncuk', 'j4nck',
    'peli', 'lonte', 'l0nt3', 'lont3', 'perek', 'prk', 'jablay', 'jablai', 'tete', 'tetek', 'toket', 'tkt', 'titit', 'tt', 'biji',
    'bokep', 'porno', 'seks', 'sex', 'crot', 'sperma', 'colmek', 'colik', 'ngocok', 'sange', 'sangek', 'toge',
    'cuki', 'cukimay', 'cukimai', 'telaso', 'sundala', 'bodat', 'bacot', 'bct',
    'open bo', 'openbo', 'vcs', 'bo',

    // --- Bahasa Inggris ---
    'fuck', 'fucker', 'fucking', 'fck', 'fckin', 'bitch', 'btch', 'asshole', 'shit', 'dick', 'pussy', 'cunt', 'bastard', 'btrd', 'whore', 'slut', 'nigger', 'nigga', 'nude', 'porn', 'sex'
];

/**
 * Daftar kata AMAN yang mengandung potongan huruf kata terlarang.
 * Mencegah kesalahan tangkap (false positive) pada nama atau kata sehari-hari.
 */
const WHITELIST = [
    'asuransi', 'asuh', 'asupan', 'terbiasa', 'biasa', 'asumsi', 'masuk', 'masukan', 'pengasuh', 'asrama', 'khas', 'dinas', 'agustinus', 'bagus', 'agus', 'basuki', 'dias',
    'pantai', 'santai', 'petai', 'retail', 'detail', 'portable', 'lantai', 'taat', 'tertai',
    'pelita', 'pelihara', 'pelindung', 'pelipis', 'peluit', 'kepeli', 'komplit',
    'tetes', 'tetesan', 'tetangga', 'tetap', 'tetamu',
    'istilah', 'sextant', 'context', 'sussex', 'middlesex', 'text', 'textile',
    'cokelat', 'coklat', 'cuaca', 'cukup', 'kecukupan',
    'muka', 'mukena', 'kompas', 'kompak', 'kamus', 'goyang', 'goyangku',
    'budi', 'taufik', 'siti', 'rian', 'dian', 'anisa', 'putri', 'rudi', 'dodi', 'yudi', 'ahmad'
];

const HATE_WORDS = [
    'aseng', 'cino', 'kadrun', 'cebong', 'komunis', 'kafir', 'pribumi', 'cina'
];

const PROVOCATION_WORDS = [
    'bunuh', 'bakar', 'serang', 'hancurkan', 'basmi', 'tumpas', 'perang', 'bom', 'teroris'
];

const LEET_MAP = {
    '4': 'a', '@': 'a', '^': 'a', 'д': 'a', 'а': 'a', 'α': 'a',
    '8': 'b', 'в': 'b',
    '(': 'c', '<': 'c', 'с': 'c', '[': 'c', '{': 'c',
    '3': 'e', '€': 'e', 'е': 'e', 'э': 'e',
    '6': 'g', '9': 'g',
    '1': 'i', '!': 'i', '|': 'i', '¡': 'i', 'і': 'i',
    '0': 'o', 'о': 'o', 'ø': 'o',
    '5': 's', '$': 's',
    '7': 't', '+': 't', 'т': 't',
    'v': 'u', 'µ': 'u',
    'у': 'y', 'х': 'x', 'р': 'p', 'н': 'n', 'м': 'm', 'к': 'k',
};

function stripInvisibleChars(text) {
    return text.replace(/[\u200B-\u200F\u202A-\u202E\uFEFF\u00AD]/g, '');
}

function applyLeetMap(text) {
    return text.replace(/./g, (ch) => LEET_MAP[ch] || ch);
}

function normalizePhonetic(text) {
    return text
        .replace(/q/g, 'k')
        .replace(/x/g, 'g');
}

/**
 * Menggabungkan huruf-huruf tunggal yang dipisah spasi / simbol.
 * Contoh: "a s u" -> "asu", "a_s_u" -> "asu", "m . e . m . e . k" -> "memek"
 */
function despaceSingleLetters(text) {
    let cleaned = text.replace(/[\._\-\*\s]+/g, ' ');
    return cleaned.replace(/\b([a-z0-9])\s+(?=[a-z0-9]\b)/gi, '$1');
}

function normalizeAll(text) {
    let raw = stripInvisibleChars(text)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '');

    let leet = applyLeetMap(raw);
    let leetPhonetic = normalizePhonetic(leet);

    let despaced = despaceSingleLetters(leetPhonetic);

    let doubleCollapsed = leetPhonetic.replace(/(.)\1{2,}/g, '$1$1');
    let singleCollapsed = leetPhonetic.replace(/(.)\1+/g, '$1');
    let singleCollapsedDespaced = despaced.replace(/(.)\1+/g, '$1');

    const spaced = leetPhonetic.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const despacedSpaced = despaced.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    const compact = singleCollapsed.replace(/[^a-z0-9]/g, '');
    const compactDespaced = singleCollapsedDespaced.replace(/[^a-z0-9]/g, '');

    return {
        raw,
        spaced,
        despacedSpaced,
        compact,
        compactDespaced,
        singleCollapsed,
        singleCollapsedDespaced
    };
}

function stripWhitelisted(text) {
    let result = text;
    for (const safe of WHITELIST) {
        const s = safe.trim().toLowerCase();
        if (!s) continue;
        result = result.split(s).join(' ');
    }
    return result;
}

/**
 * Memeriksa apakah teks mengandung kata terlarang.
 * @param {string} text
 * @param {object} [options]
 * @returns {boolean|{matched: boolean, words: string[]}}
 */
function containsBadWords(text, options = {}) {
    const { detail = false } = options;
    if (!text || typeof text !== 'string') {
        return detail ? { matched: false, words: [] } : false;
    }

    const norm = normalizeAll(text);
    const compactSafe = stripWhitelisted(norm.compact);
    const compactDespacedSafe = stripWhitelisted(norm.compactDespaced);

    const foundWords = new Set();
    const suffixPattern = '(?:mu|nya|ku|lu|el|er|ers|an|k|q|z|s|h|i|a)?';

    const allTokens = new Set([
        ...norm.spaced.split(/\s+/),
        ...norm.despacedSpaced.split(/\s+/),
        ...norm.singleCollapsed.split(/[^a-z0-9]+/),
        ...norm.singleCollapsedDespaced.split(/[^a-z0-9]+/)
    ]);

    for (const raw of BAD_WORDS) {
        const word = raw.trim().toLowerCase();
        if (!word) continue;

        const regexWithSuffix = new RegExp(`\\b${escapeRegExp(word)}${suffixPattern}\\b`, 'i');

        // 0. Direct Raw Check (untuk frasa khusus seperti "open bo", "vcs")
        if (new RegExp(`\\b${escapeRegExp(word)}${suffixPattern}\\b`, 'i').test(norm.raw)) {
            foundWords.add(word);
            continue;
        }

        // 1. Spaced & Despaced Boundary Regex Match
        if (regexWithSuffix.test(norm.spaced) || regexWithSuffix.test(norm.despacedSpaced)) {
            foundWords.add(word);
            continue;
        }

        // 2. Tokenized Exact Match
        for (const token of allTokens) {
            if (!token) continue;
            if (WHITELIST.includes(token)) continue;

            if (token === word || new RegExp(`^${escapeRegExp(word)}${suffixPattern}$`, 'i').test(token)) {
                foundWords.add(word);
                break;
            }
        }

        // 3. Compact Substring Match
        if (word.length >= 4) {
            if (compactSafe.includes(word) || compactDespacedSafe.includes(word)) {
                foundWords.add(word);
            }
        } else if (word.length >= 2) {
            if (allTokens.has(word)) {
                foundWords.add(word);
            }
        }
    }

    if (detail) {
        return { matched: foundWords.size > 0, words: Array.from(foundWords) };
    }
    return foundWords.size > 0;
}

function matchWordList(text, wordList) {
    if (!text || typeof text !== 'string') return [];
    const norm = normalizeAll(text);
    const found = new Set();

    for (const raw of wordList) {
        const word = raw.trim().toLowerCase();
        if (!word) continue;
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
        if (regex.test(norm.spaced) || regex.test(norm.despacedSpaced) || norm.compact.includes(word)) {
            found.add(word);
        }
    }
    return Array.from(found);
}

function detectSpam(text) {
    if (!text || typeof text !== 'string') return { isSpam: false, reasons: [] };

    const reasons = [];
    const t = text.toLowerCase();

    if (/(https?:\/\/|www\.|\.(com|net|id|org|xyz|info)\b)/i.test(t)) {
        reasons.push('url');
    }

    if (/(\+?62|0)8[0-9]{8,12}/.test(t.replace(/[\s\-()]/g, ''))) {
        reasons.push('nomor_telepon');
    }

    const words = t.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 6) {
        const freq = {};
        for (const w of words) freq[w] = (freq[w] || 0) + 1;
        const maxFreq = Math.max(...Object.values(freq));
        if (maxFreq / words.length > 0.5) reasons.push('flood_kata');
    }

    if (/(.)\1{9,}/.test(t)) reasons.push('flood_karakter');

    return { isSpam: reasons.length > 0, reasons };
}

function moderateText(text) {
    const badResult = containsBadWords(text, { detail: true });
    const hateWords = matchWordList(text, HATE_WORDS);
    const provocationWords = matchWordList(text, PROVOCATION_WORDS);
    const spam = detectSpam(text);

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
