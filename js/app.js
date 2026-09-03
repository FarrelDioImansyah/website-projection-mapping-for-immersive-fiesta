/**
 * app.js — Frontend Logic
 * ========================
 * Berisi semua logic UI dan alur upload data ke Supabase.
 * File ini bergantung pada `config.js` yang harus di-load lebih dulu.
 *
 * Alur:
 *  1. User klik "Buka Kamera" → WebRTC getUserMedia membuka kamera
 *  2. Live preview muncul di halaman
 *  3. User klik tombol shutter → frame di-capture ke <canvas>
 *  4. Foto preview ditampilkan, stream kamera dimatikan
 *  5. User submit form → foto dikompres, di-upload ke Supabase Storage
 *  6. Metadata (nama, caption, image_url) di-insert ke database
 */

// =============================================
// DOM REFERENCES
// =============================================
const form = document.getElementById('uploadForm');
const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');

// Camera DOM Elements (Step 1)
const cameraIdle = document.getElementById('cameraIdle');
const cameraPreview = document.getElementById('cameraPreview');
const photoResult = document.getElementById('photoResult');
const videoEl = document.getElementById('cameraVideo');
const captureCanvas = document.getElementById('captureCanvas');
const capturedImg = document.getElementById('capturedImg');

const btnOpenCamera = document.getElementById('btnOpenCamera');
const btnCapture = document.getElementById('btnCapture');
const btnCancelCamera = document.getElementById('btnCancelCamera');
const btnFlipCamera = document.getElementById('btnFlipCamera');
const btnRetake = document.getElementById('btnRetake');

// Step 2 & 3 DOM Elements
const stepContents = document.querySelectorAll('.step-content');
const btnGoToStep2 = document.getElementById('btnGoToStep2');
const btnBackToStep1 = document.getElementById('btnBackToStep1');
const btnGoToStep3 = document.getElementById('btnGoToStep3');
const btnBackToStep2 = document.getElementById('btnBackToStep2');

const borderButtons = document.querySelectorAll('.border-grid-btn');
const editorCanvas = document.getElementById('editorCanvas');
const stickerCanvas = document.getElementById('stickerCanvas'); // Step 3 interactive canvas
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnZoomReset = document.getElementById('btnZoomReset');

// Name Sticker DOM Elements (Step 3)
const toggleSticker = document.getElementById('toggleSticker');
const stickerControlsBody = document.getElementById('stickerControlsBody');
const stickerTextInput = document.getElementById('stickerTextInput');
const stickerSizeSlider = document.getElementById('stickerSizeSlider');
const stickerSizeVal = document.getElementById('stickerSizeVal');
const btnStickerShrink = document.getElementById('btnStickerShrink');
const btnStickerEnlarge = document.getElementById('btnStickerEnlarge');
const stickerRotateSlider = document.getElementById('stickerRotateSlider');
const stickerRotateVal = document.getElementById('stickerRotateVal');
const btnStickerRotateLeft = document.getElementById('btnStickerRotateLeft');
const btnStickerRotateRight = document.getElementById('btnStickerRotateRight');
const btnResetStickerPos = document.getElementById('btnResetStickerPos');

const confirmNama = document.getElementById('confirmNama');
const confirmCaption = document.getElementById('confirmCaption');

// =============================================
// GLOBAL & CAMERA STATE
// =============================================
let mediaStream = null;   // Active MediaStream
let capturedBlob = null;   // Captured photo as Blob (used for upload)
let facingMode = 'user'; // 'user' = depan, 'environment' = belakang
let rawImageSrc = null;   // Menyimpan base64 dari foto asli (tanpa border)
let selectedBorderId = 1;     // ID border terpilih (default: Frame 1)

// Preload Custom Borders (PNG)
const borderImages = {};
const borderPaths = {
    1: 'assets/borders/BORDER_1.png',
    2: 'assets/borders/BORDER_2.png',
    3: 'assets/borders/BORDER_3.png',
    4: 'assets/borders/BORDER_4.png',
    5: 'assets/borders/BORDER_5.png'
};

// Mulai preload saat aplikasi dibuka
function preloadBorders() {
    for (const id in borderPaths) {
        const img = new Image();
        img.src = borderPaths[id];
        borderImages[id] = img;
    }
}
preloadBorders();

// =============================================
// CAMERA HELPERS
// =============================================

/** Tampilkan hanya satu state panel kamera */
function setCameraState(state) {
    // state: 'idle' | 'preview' | 'result'
    cameraIdle.classList.toggle('hidden', state !== 'idle');
    cameraPreview.classList.toggle('hidden', state !== 'preview');
    photoResult.classList.toggle('hidden', state !== 'result');
}

/** Mulai stream kamera menggunakan WebRTC getUserMedia */
async function startCamera() {
    // Hentikan stream lama jika ada
    stopStream();

    const constraints = {
        video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
        },
        audio: false,
    };

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl.srcObject = mediaStream;
        setCameraState('preview');
    } catch (err) {
        console.warn('[Camera] Percobaan pertama gagal, mencoba fallback sederhana...', err);
        // Fallback jika constraint ideal gagal atau timeout
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: facingMode ? { facingMode } : true,
                audio: false
            });
            videoEl.srcObject = mediaStream;
            setCameraState('preview');
            return;
        } catch (fallbackErr) {
            console.error('[Camera] getUserMedia error:', fallbackErr);
            let msg = 'Tidak bisa mengakses kamera.';
            if (fallbackErr.name === 'NotAllowedError') msg = 'Akses kamera ditolak. Izinkan izin kamera di browser.';
            else if (fallbackErr.name === 'NotFoundError') msg = 'Kamera tidak ditemukan di perangkat ini.';
            else if (fallbackErr.name === 'NotReadableError' || fallbackErr.name === 'AbortError') {
                msg = 'Kamera timeout / sedang dipakai aplikasi lain (OBS, Zoom, Discord, atau tab lain). Tutup aplikasi tersebut dan coba lagi.';
            }
            showStatus(msg, 'error');
        }
    }
}

/** Hentikan semua track pada stream aktif */
function stopStream() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
        videoEl.srcObject = null;
    }
}

/** Pindah ke langkah/halaman form tertentu (0: Welcome, 1: Data & Selfie, 2: Editor & Submit, 3: Ending Thank You, 'loading': Cosmic Loading) */
function goToStep(stepNum) {
    const step0 = document.getElementById('step0');   // Welcome Screen
    const step1 = document.getElementById('step1');   // Data & Selfie
    const step2 = document.getElementById('step2');   // Editor & Submit
    const step3 = document.getElementById('step3');   // Ending Thank You Screen
    const loadingScreen = document.getElementById('loadingScreen'); // Cosmic Loading Screen

    // Sembunyikan/tampilkan overlay screens (di luar card)
    if (step0) step0.style.display = (stepNum === 0) ? '' : 'none';
    if (step3) step3.style.display = (stepNum === 3) ? '' : 'none';
    if (loadingScreen) loadingScreen.style.display = (stepNum === 'loading') ? '' : 'none';

    // Sembunyikan/tampilkan card (header, form, footer)
    const card = document.querySelector('.card');
    if (card) {
        card.style.display = (stepNum === 0 || stepNum === 3 || stepNum === 'loading') ? 'none' : '';
    }

    // Step 1 & 2 di dalam form
    if (step1) step1.classList.toggle('active', stepNum === 1);
    if (step2) step2.classList.toggle('active', stepNum === 2);
}

// Inisialisasi awal ke Step 0 Welcome Screen
goToStep(0);



/** Ambil foto dari frame video saat ini menggunakan canvas */
function capturePhoto() {
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;

    captureCanvas.width = w;
    captureCanvas.height = h;

    const ctx = captureCanvas.getContext('2d');

    // Mirror jika kamera depan (agar preview natural)
    if (facingMode === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(videoEl, 0, 0, w, h);

    // Simpan gambar asli (polos) untuk render ulang border nantinya
    rawImageSrc = captureCanvas.toDataURL('image/jpeg', 0.95);

    // Flash animation
    flashEffect();

    // Reset pilihan border visual ke Frame 1 (ID: 1) saat baru capture
    selectedBorderId = 1;
    borderButtons.forEach(btn => {
        const id = parseInt(btn.dataset.borderId, 10);
        btn.classList.toggle('active', id === 1);
    });

    stopStream();
    setCameraState('result');

    // Set preview thumbnail polos di Step 1
    capturedImg.src = rawImageSrc;

    // Aktifkan tombol navigasi ke Step 2
    btnGoToStep2.disabled = false;
}

// =============================================
// TWIBBON EDITOR & STICKER STATE
// =============================================

// State posisi dan skala foto di dalam editor
let editor = {
    photoImg: null,        // HTMLImageElement foto selfie
    photoX: 0,             // Offset X tengah foto (dalam pixel canvas)
    photoY: 0,             // Offset Y tengah foto (dalam pixel canvas)
    photoScale: 1,         // Skala foto (1 = fit ke canvas)
    baseScale: 1,          // Skala dasar saat reset (cover)
    isDragging: false,
    lastX: 0,
    lastY: 0,
    // Pinch-to-zoom state
    lastPinchDist: 0,
    rafId: null,           // requestAnimationFrame ID
};

// Target aktif saat drag: 'photo' | 'sticker' | null
let activeDragTarget = null;

// State Stiker Nama Kustom
let sticker = {
    enabled: true,
    text: '',
    designX: 960,          // Posisi X di koordinat desain 1920x1080
    designY: 865,          // Posisi Y di koordinat desain 1920x1080
    scale: 1.0,            // Skala ukuran stiker (0.4 - 2.2)
    rotation: 0,           // Derajat rotasi stiker (-45 s.d +45)
    isDragging: false,
    dragOffsetDesignX: 0,
    dragOffsetDesignY: 0,
    hasCustomPos: false,
    lastBounds: null       // Cache bounding box di koordinat canvas untuk hit-testing
};

// Posisi & rotasi default teks nama di area kotak putih banner untuk tiap border (1920x1080)
const BORDER_STICKER_DEFAULTS = {
    0: { x: 960, y: 920, rotation: 0 },
    1: { x: 750, y: 850, rotation: -7 },
    2: { x: 850, y: 850, rotation: 6 },
    3: { x: 950, y: 830, rotation: -5.6 },
    4: { x: 820, y: 870, rotation: -1.5 },
    5: { x: 860, y: 825, rotation: -1 }
};

/**
 * Hitung posisi & skala awal foto agar memenuhi canvas secara proporsional (cover).
 * @param {number} cw - Lebar canvas
 * @param {number} ch - Tinggi canvas
 */
function resetEditorState(cw, ch) {
    const img = editor.photoImg;
    if (!img) return;

    const scaleX = cw / img.width;
    const scaleY = ch / img.height;
    const base = Math.max(scaleX, scaleY); // cover

    editor.baseScale = base;
    editor.photoScale = base;
    editor.photoX = cw / 2;
    editor.photoY = ch / 2;
}

// Konfigurasi Parameter Clipping Mask untuk Tiap Border
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const BORDER_MASKS = {
    // Frame 1 (Circle)
    1: {
        type: 'circle',
        x: 503.8,
        y: 103.4,
        width: 846.4,
        height: 846.4
    },
    // Frame 2 (Circle)
    2: {
        type: 'circle',
        x: 539.6,
        y: 116.4,
        width: 839.4,
        height: 839.4
    },
    // Frame 3 (Circle)
    3: {
        type: 'circle',
        x: 498.0,
        y: 134.1,
        width: 831.2,
        height: 831.2
    },
    // Frame 4 (Rounded Rectangle)
    4: {
        type: 'roundRect',
        x: 618.0,
        y: 199.0,
        width: 750.0,
        height: 750.0,
        radius: 110
    },
    // Frame 5 (Rounded Rectangle)
    5: {
        type: 'roundRect',
        x: 553.0,
        y: 175.0,
        width: 750.0,
        height: 750.0,
        radius: 110
    }
};

/**
 * Terapkan clipping mask presisi untuk foto berdasarkan border terpilih.
 * Memotong foto tepat di lingkar/sudut dalam bingkai agar tidak bocor ke luar.
 */
function applyBorderClipMask(ctx, borderId, cw, ch) {
    const mask = BORDER_MASKS[borderId];
    if (!mask || borderId <= 0) return;

    const scaleX = cw / DESIGN_WIDTH;
    const scaleY = ch / DESIGN_HEIGHT;

    const x = mask.x * scaleX;
    const y = mask.y * scaleY;
    const width = mask.width * scaleX;
    const height = mask.height * scaleY;

    ctx.beginPath();
    if (mask.type === 'roundRect') {
        const radius = (mask.radius || 20) * scaleX;
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, width, height, radius);
        } else {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }
    } else {
        const cx = x + width / 2;
        const cy = y + height / 2;
        const rx = width / 2;
        const ry = height / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.clip();
}

/**
 * Render Teks Nama Otomatis pada Frame Border (Layer Teratas)
 * Menyesuaikan posisi & kemiringan (rotasi) kotak putih tiap border.
 */
function drawAutoNameOnBorder(ctx, cw, ch) {
    const namaInput = document.getElementById('nama');
    const nameText = (namaInput ? namaInput.value.trim() : '').toUpperCase();
    if (!nameText) return;

    const scaleX = cw / DESIGN_WIDTH;
    const scaleY = ch / DESIGN_HEIGHT;

    const def = BORDER_STICKER_DEFAULTS[selectedBorderId] || BORDER_STICKER_DEFAULTS[0];

    const posX = def.x * scaleX;
    const posY = def.y * scaleY;

    // Ukuran dasar font pada desain 1920x1080
    const baseFontSize = 60;
    const fontSize = Math.max(16, Math.round(baseFontSize * scaleX));

    ctx.save();
    ctx.translate(posX, posY);

    // Terapkan Rotasi Kemiringan Kustom per Border Template
    const rotRad = ((def.rotation || 0) * Math.PI) / 180;
    ctx.rotate(rotRad);

    // Font Berlin Sans / Trebuchet MS dengan warna Hitam Pekat
    const fontFamily = "'Berlin Sans FB', 'Berlin Sans FB Demi', 'Berlin Sans', 'Trebuchet MS', 'Arial Black', sans-serif";

    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Render Teks Nama di kotak putih border
    ctx.fillStyle = '#111111';
    ctx.fillText(nameText, 0, 1 * scaleX);

    ctx.restore();
}

/**
 * Render editor canvas (Step 2): foto + border + nama otomatis.
 */
function renderEditor() {
    if (!editorCanvas || !editor.photoImg) return;

    const cw = editorCanvas.width;
    const ch = editorCanvas.height;
    const ctx = editorCanvas.getContext('2d');

    ctx.clearRect(0, 0, cw, ch);

    // --- 1. Gambar Foto (dengan clipping mask & transformasi) ---
    ctx.save();
    applyBorderClipMask(ctx, selectedBorderId, cw, ch);
    ctx.translate(editor.photoX, editor.photoY);
    ctx.scale(editor.photoScale, editor.photoScale);
    const pw = editor.photoImg.width;
    const ph = editor.photoImg.height;
    ctx.drawImage(editor.photoImg, -pw / 2, -ph / 2, pw, ph);
    ctx.restore();

    // --- 2. Gambar Border PNG di atasnya ---
    if (selectedBorderId > 0) {
        const borderImg = borderImages[selectedBorderId];
        if (borderImg && borderImg.complete) {
            ctx.drawImage(borderImg, 0, 0, cw, ch);
        }
    }

    // --- 3. Gambar Teks Nama Otomatis di atas border ---
    drawAutoNameOnBorder(ctx, cw, ch);
}

// =============================================
// STEP 3 — STICKER CANVAS (interaktif pinch)
// =============================================

// Snapshot foto+border yang sudah di-render dari editorCanvas
let compositeImg = null;

// State pinch two-finger untuk stiker
let stickerPinch = {
    active: false,
    lastDist: 0,
    lastAngle: 0,
    lastScale: 1,
    lastRotation: 0
};

/**
 * Inisialisasi stickerCanvas di Step 3:
 * Ambil snapshot editorCanvas (foto+border), lalu render ulang dengan stiker interaktif.
 */
function initStickerCanvas() {
    if (!stickerCanvas) return;
    if (!editor.photoImg) return;

    // Samakan ukuran dengan editorCanvas
    stickerCanvas.width = editorCanvas.width;
    stickerCanvas.height = editorCanvas.height;

    // Ambil snapshot foto+border dari editorCanvas sebagai base image
    compositeImg = new Image();
    compositeImg.src = editorCanvas.toDataURL('image/png');
    compositeImg.onload = () => renderStickerCanvas();
}

/**
 * Render stickerCanvas: composite (foto+border) + stiker nama interaktif.
 */
function renderStickerCanvas() {
    if (!stickerCanvas || !compositeImg) return;
    const cw = stickerCanvas.width;
    const ch = stickerCanvas.height;
    const ctx = stickerCanvas.getContext('2d');

    ctx.clearRect(0, 0, cw, ch);

    // Gambar snapshot foto+border
    ctx.drawImage(compositeImg, 0, 0, cw, ch);

    // Gambar stiker di atas (interaktif, tampilkan selection box)
    drawNameSticker(ctx, cw, ch, true);
}

// Mouse drag stiker di stickerCanvas
let stickerDragActive = false;

stickerCanvas && stickerCanvas.addEventListener('mousedown', (e) => {
    const rect = stickerCanvas.getBoundingClientRect();
    const sr = stickerCanvas.width / rect.width;
    const cx = (e.clientX - rect.left) * sr;
    const cy = (e.clientY - rect.top) * sr;
    if (isPointInSticker(cx, cy)) {
        stickerDragActive = true;
        sticker.isDragging = true;
        sticker.hasCustomPos = true;
        const sx = stickerCanvas.width / DESIGN_WIDTH;
        const sy = stickerCanvas.height / DESIGN_HEIGHT;
        sticker.dragOffsetDesignX = sticker.designX - (cx / sx);
        sticker.dragOffsetDesignY = sticker.designY - (cy / sy);
        stickerCanvas.style.cursor = 'grabbing';
        renderStickerCanvas();
    }
});

window.addEventListener('mousemove', (e) => {
    if (!stickerDragActive) return;
    const rect = stickerCanvas.getBoundingClientRect();
    const sr = stickerCanvas.width / rect.width;
    const cx = (e.clientX - rect.left) * sr;
    const cy = (e.clientY - rect.top) * sr;
    const sx = stickerCanvas.width / DESIGN_WIDTH;
    const sy = stickerCanvas.height / DESIGN_HEIGHT;
    sticker.designX = (cx / sx) + sticker.dragOffsetDesignX;
    sticker.designY = (cy / sy) + sticker.dragOffsetDesignY;
    renderStickerCanvas();
});

window.addEventListener('mouseup', () => {
    if (stickerDragActive) {
        stickerDragActive = false;
        sticker.isDragging = false;
        if (stickerCanvas) stickerCanvas.style.cursor = 'grab';
        renderStickerCanvas();
    }
});

/**
 * Touch handlers untuk stickerCanvas:
 * - 1 jari: drag stiker
 * - 2 jari: pinch untuk ukuran, putar untuk rotasi
 */
stickerCanvas && stickerCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        // Single touch — drag stiker
        const rect = stickerCanvas.getBoundingClientRect();
        const sr = stickerCanvas.width / rect.width;
        const cx = (e.touches[0].clientX - rect.left) * sr;
        const cy = (e.touches[0].clientY - rect.top) * sr;
        stickerDragActive = true;
        sticker.isDragging = true;
        sticker.hasCustomPos = true;
        const sx = stickerCanvas.width / DESIGN_WIDTH;
        const sy = stickerCanvas.height / DESIGN_HEIGHT;
        sticker.dragOffsetDesignX = sticker.designX - (cx / sx);
        sticker.dragOffsetDesignY = sticker.designY - (cy / sy);
        stickerPinch.active = false;
        renderStickerCanvas();
    } else if (e.touches.length === 2) {
        // Two fingers — pinch + rotate
        stickerDragActive = false;
        sticker.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        stickerPinch.active = true;
        stickerPinch.lastDist = Math.hypot(dx, dy);
        stickerPinch.lastAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        stickerPinch.lastScale = sticker.scale;
        stickerPinch.lastRotation = sticker.rotation || 0;
    }
}, { passive: false });

stickerCanvas && stickerCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && stickerDragActive) {
        const rect = stickerCanvas.getBoundingClientRect();
        const sr = stickerCanvas.width / rect.width;
        const cx = (e.touches[0].clientX - rect.left) * sr;
        const cy = (e.touches[0].clientY - rect.top) * sr;
        const sx = stickerCanvas.width / DESIGN_WIDTH;
        const sy = stickerCanvas.height / DESIGN_HEIGHT;
        sticker.designX = (cx / sx) + sticker.dragOffsetDesignX;
        sticker.designY = (cy / sy) + sticker.dragOffsetDesignY;
        renderStickerCanvas();
    } else if (e.touches.length === 2 && stickerPinch.active) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Skala proporsional dengan jarak antar jari
        const scaleDelta = dist / stickerPinch.lastDist;
        const newScale = Math.max(0.4, Math.min(2.2, stickerPinch.lastScale * scaleDelta));
        sticker.scale = newScale;
        if (stickerSizeSlider) stickerSizeSlider.value = Math.round(newScale * 100);
        if (stickerSizeVal) stickerSizeVal.textContent = Math.round(newScale * 100) + '%';

        // Rotasi proporsional dengan sudut antar jari
        const angleDelta = angle - stickerPinch.lastAngle;
        const newRot = Math.max(-45, Math.min(45, stickerPinch.lastRotation + angleDelta));
        sticker.rotation = newRot;
        if (stickerRotateSlider) stickerRotateSlider.value = Math.round(newRot);
        if (stickerRotateVal) stickerRotateVal.textContent = (newRot >= 0 ? '+' : '') + Math.round(newRot) + '°';

        renderStickerCanvas();
    }
}, { passive: false });

stickerCanvas && stickerCanvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        stickerDragActive = false;
        sticker.isDragging = false;
        stickerPinch.active = false;
        renderStickerCanvas();
    } else if (e.touches.length === 1 && stickerPinch.active) {
        // Selesai pinch, kembali ke mode drag
        stickerPinch.active = false;
        stickerPinch.lastScale = sticker.scale;
        stickerPinch.lastRotation = sticker.rotation || 0;
    }
}, { passive: false });

/**
 * Inisialisasi editor Twibbon dengan foto selfie & border terpilih.
 * Dipanggil saat masuk Step 2 atau saat border berganti.
 * @param {number} borderId - ID border yang dipilih (0 s.d 5)
 */
function initEditor(borderId) {
    if (!rawImageSrc) return;

    selectedBorderId = borderId;

    // Tentukan dimensi canvas sesuai aspek rasio border (atau foto jika polos)
    const maxW = 800;
    const borderImg = borderImages[borderId];
    let cw, ch;

    if (borderId > 0 && borderImg && borderImg.complete) {
        cw = Math.min(maxW, borderImg.naturalWidth);
        ch = Math.round(cw * (borderImg.naturalHeight / borderImg.naturalWidth));
    } else if (editor.photoImg) {
        const pi = editor.photoImg;
        cw = Math.min(maxW, pi.width);
        ch = Math.round(cw * (pi.height / pi.width));
    } else {
        cw = maxW;
        ch = maxW;
    }

    editorCanvas.width = cw;
    editorCanvas.height = ch;

    // Jika foto belum diload, load dulu
    if (!editor.photoImg || editor.photoImg.src !== rawImageSrc) {
        const img = new Image();
        img.src = rawImageSrc;
        img.onload = () => {
            editor.photoImg = img;
            resetEditorState(cw, ch);
            renderEditor();
        };
    } else {
        resetEditorState(cw, ch);
        renderEditor();
    }
}

/**
 * Bake komposisi akhir (foto + border + stiker dari Step 3) ke captureCanvas
 * untuk di-upload ke Supabase. Dipanggil saat user klik submit.
 * @returns {Promise<Blob>}
 */
function bakeEditorToCapture() {
    if (!editor.photoImg) return Promise.resolve(null);

    const cw = editorCanvas.width;
    const ch = editorCanvas.height;

    captureCanvas.width = cw;
    captureCanvas.height = ch;

    const ctx = captureCanvas.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);

    // 1. Gambar foto dengan masking
    ctx.save();
    applyBorderClipMask(ctx, selectedBorderId, cw, ch);
    ctx.translate(editor.photoX, editor.photoY);
    ctx.scale(editor.photoScale, editor.photoScale);
    const pw = editor.photoImg.width;
    const ph = editor.photoImg.height;
    ctx.drawImage(editor.photoImg, -pw / 2, -ph / 2, pw, ph);
    ctx.restore();

    // 2. Gambar border
    if (selectedBorderId > 0) {
        const borderImg = borderImages[selectedBorderId];
        if (borderImg && borderImg.complete) {
            ctx.drawImage(borderImg, 0, 0, cw, ch);
        }
    }

    // 3. Gambar Teks Nama Otomatis di atas border
    drawAutoNameOnBorder(ctx, cw, ch);

    // Simpan ke Blob PNG untuk upload
    return new Promise((resolve) => {
        captureCanvas.toBlob((blob) => {
            capturedBlob = blob;
            resolve(blob);
        }, 'image/png');
    });
}

// =============================================
// EDITOR DRAG (MOUSE) — FOTO
// =============================================

editorCanvas.addEventListener('mousedown', (e) => {
    editor.isDragging = true;
    editor.lastX = e.clientX;
    editor.lastY = e.clientY;
    editorCanvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
    if (!editor.isDragging) return;
    const rect = editorCanvas.getBoundingClientRect();
    const scaleRatio = editorCanvas.width / rect.width;
    const dx = e.clientX - editor.lastX;
    const dy = e.clientY - editor.lastY;
    editor.lastX = e.clientX;
    editor.lastY = e.clientY;
    editor.photoX += dx * scaleRatio;
    editor.photoY += dy * scaleRatio;
    renderEditor();
});

window.addEventListener('mouseup', () => {
    if (editor.isDragging) {
        editor.isDragging = false;
        editorCanvas.style.cursor = 'grab';
    }
});

// =============================================
// EDITOR DRAG + PINCH (TOUCH) — FOTO
// =============================================

editorCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        editor.isDragging = true;
        editor.lastX = e.touches[0].clientX;
        editor.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        editor.isDragging = false;
        editor.lastPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
}, { passive: false });

editorCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = editorCanvas.getBoundingClientRect();
    const scaleRatio = editorCanvas.width / rect.width;

    if (e.touches.length === 1 && editor.isDragging) {
        const dx = e.touches[0].clientX - editor.lastX;
        const dy = e.touches[0].clientY - editor.lastY;
        editor.lastX = e.touches[0].clientX;
        editor.lastY = e.touches[0].clientY;
        editor.photoX += dx * scaleRatio;
        editor.photoY += dy * scaleRatio;
        renderEditor();
    } else if (e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        if (editor.lastPinchDist > 0) {
            const delta = dist / editor.lastPinchDist;
            editor.photoScale = Math.max(editor.baseScale * 0.3, Math.min(editor.photoScale * delta, editor.baseScale * 5));
        }
        editor.lastPinchDist = dist;
        renderEditor();
    }
}, { passive: false });

editorCanvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        editor.isDragging = false;
        editor.lastPinchDist = 0;
    }
}, { passive: false });

// =============================================
// EDITOR ZOOM BUTTONS
// =============================================

btnZoomIn.addEventListener('click', () => {
    editor.photoScale = Math.min(editor.photoScale * 1.15, editor.baseScale * 5);
    renderEditor();
});

btnZoomOut.addEventListener('click', () => {
    editor.photoScale = Math.max(editor.photoScale / 1.15, editor.baseScale * 0.3);
    renderEditor();
});

btnZoomReset.addEventListener('click', () => {
    resetEditorState(editorCanvas.width, editorCanvas.height);
    renderEditor();
});

// =============================================
// STICKER CONTROLS LISTENERS (Step 3)
// =============================================

// Toggle Aktif/Nonaktif Stiker
if (toggleSticker) {
    toggleSticker.addEventListener('change', (e) => {
        sticker.enabled = e.target.checked;
        if (stickerControlsBody) {
            stickerControlsBody.classList.toggle('disabled', !sticker.enabled);
        }
        renderStickerCanvas();
    });
}

// Input Edit Teks Stiker Langsung
if (stickerTextInput) {
    stickerTextInput.addEventListener('input', (e) => {
        sticker.text = e.target.value;
        renderStickerCanvas();
    });
}

// Slider Ukuran Stiker
if (stickerSizeSlider) {
    stickerSizeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        sticker.scale = val / 100;
        if (stickerSizeVal) stickerSizeVal.textContent = val + '%';
        renderStickerCanvas();
    });
}

// Tombol Kecilkan Stiker (-)
if (btnStickerShrink) {
    btnStickerShrink.addEventListener('click', () => {
        let val = parseInt(stickerSizeSlider.value, 10) - 10;
        val = Math.max(parseInt(stickerSizeSlider.min, 10), val);
        stickerSizeSlider.value = val;
        sticker.scale = val / 100;
        if (stickerSizeVal) stickerSizeVal.textContent = val + '%';
        renderStickerCanvas();
    });
}

// Tombol Besarkan Stiker (+)
if (btnStickerEnlarge) {
    btnStickerEnlarge.addEventListener('click', () => {
        let val = parseInt(stickerSizeSlider.value, 10) + 10;
        val = Math.min(parseInt(stickerSizeSlider.max, 10), val);
        stickerSizeSlider.value = val;
        sticker.scale = val / 100;
        if (stickerSizeVal) stickerSizeVal.textContent = val + '%';
        renderStickerCanvas();
    });
}

// Slider Rotasi Stiker
if (stickerRotateSlider) {
    stickerRotateSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        sticker.rotation = val;
        if (stickerRotateVal) stickerRotateVal.textContent = (val > 0 ? `+${val}` : val) + '°';
        renderStickerCanvas();
    });
}

// Tombol Putar Kiri (↶)
if (btnStickerRotateLeft) {
    btnStickerRotateLeft.addEventListener('click', () => {
        let val = parseInt(stickerRotateSlider.value, 10) - 2;
        val = Math.max(parseInt(stickerRotateSlider.min, 10), val);
        stickerRotateSlider.value = val;
        sticker.rotation = val;
        if (stickerRotateVal) stickerRotateVal.textContent = (val > 0 ? `+${val}` : val) + '°';
        renderStickerCanvas();
    });
}

// Tombol Putar Kanan (↷)
if (btnStickerRotateRight) {
    btnStickerRotateRight.addEventListener('click', () => {
        let val = parseInt(stickerRotateSlider.value, 10) + 2;
        val = Math.min(parseInt(stickerRotateSlider.max, 10), val);
        stickerRotateSlider.value = val;
        sticker.rotation = val;
        if (stickerRotateVal) stickerRotateVal.textContent = (val > 0 ? `+${val}` : val) + '°';
        renderStickerCanvas();
    });
}

// Reset Posisi & Rotasi Stiker ke Default Banner Bawah
if (btnResetStickerPos) {
    btnResetStickerPos.addEventListener('click', () => {
        sticker.hasCustomPos = false;
        const def = BORDER_STICKER_DEFAULTS[selectedBorderId] || BORDER_STICKER_DEFAULTS[0];
        sticker.designX = def.x;
        sticker.designY = def.y;
        sticker.rotation = def.rotation !== undefined ? def.rotation : 0;
        sticker.scale = 1.0;
        if (stickerSizeSlider) stickerSizeSlider.value = 100;
        if (stickerSizeVal) stickerSizeVal.textContent = '100%';
        if (stickerRotateSlider) stickerRotateSlider.value = sticker.rotation;
        if (stickerRotateVal) stickerRotateVal.textContent = (sticker.rotation > 0 ? `+${sticker.rotation}` : sticker.rotation) + '°';
        renderStickerCanvas();
    });
}

/** Efek flash singkat saat capture */
function flashEffect() {
    const flash = document.createElement('div');
    flash.style.cssText = `
        position:fixed; inset:0; background:white;
        opacity:0.8; z-index:9999; pointer-events:none;
        animation: flashOut 0.3s ease forwards;
    `;

    // Inline keyframe via style tag
    if (!document.getElementById('flash-style')) {
        const style = document.createElement('style');
        style.id = 'flash-style';
        style.textContent = '@keyframes flashOut { from { opacity: 0.8; } to { opacity: 0; } }';
        document.head.appendChild(style);
    }

    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 320);
}

// =============================================
// CAMERA & NAVIGATION EVENT LISTENERS
// =============================================

btnOpenCamera.addEventListener('click', () => {
    startCamera();
});

btnCapture.addEventListener('click', () => {
    capturePhoto();
});

btnCancelCamera.addEventListener('click', () => {
    stopStream();
    capturedBlob = null;
    rawImageSrc = null;
    btnGoToStep2.disabled = true;
    setCameraState('idle');
    hideStatus();
});

btnFlipCamera.addEventListener('click', () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(); // Restart dengan kamera yang berbeda
});

btnRetake.addEventListener('click', () => {
    capturedBlob = null;
    rawImageSrc = null;
    capturedImg.src = '';
    btnGoToStep2.disabled = true;
    startCamera();
});

// === Multi-Step Navigation Buttons ===

// Step 0 (Welcome Screen) -> Step 1
const welcomeStep = document.getElementById('step0');
if (welcomeStep) {
    welcomeStep.addEventListener('click', () => {
        goToStep(1);
    });
}

// Step 3 (Ending / Thank You Screen) -> Step 1 (Langsung buka Step 1 untuk pengunjung berikutnya)
const endingStep = document.getElementById('step3');
if (endingStep) {
    endingStep.addEventListener('click', () => {
        goToStep(1);
    });
}



// Step 1 -> Step 2

btnGoToStep2.addEventListener('click', () => {
    // Validasi Nama wajib diisi sebelum lanjut
    const namaInput = document.getElementById('nama');
    const namaVal = namaInput.value.trim();
    if (!namaVal) {
        namaInput.focus();
        showStatus('Isi nama kamu terlebih dahulu!', 'error');
        setTimeout(hideStatus, 3000);
        return;
    }

    // Validasi Panjang Nama (Maksimal 10 Karakter)
    if (namaVal.length > 10) {
        namaInput.focus();
        showStatus('Nama maksimal 10 huruf!', 'error');
        setTimeout(hideStatus, 3000);
        return;
    }

    const captionInput = document.getElementById('caption');
    const captionVal = captionInput.value.trim();

    // Validasi Panjang Caption (Maksimal 85 Karakter)
    if (captionVal.length > 85) {
        captionInput.focus();
        showStatus('Caption maksimal 85 karakter!', 'error');
        setTimeout(hideStatus, 3000);
        return;
    }

    // Validasi Moderasi Konten (Badwords, Hate Speech, Provokasi, Spam)
    if (typeof moderateText === 'function') {
        const namaCheck = moderateText(namaVal);
        if (!namaCheck.allow) {
            namaInput.focus();
            let msg = 'Nama mengandung kata yang tidak pantas!';
            if (namaCheck.hateWords.length > 0) msg = 'Nama mengandung ujaran kebencian!';
            if (namaCheck.spam.isSpam) msg = 'Nama tidak boleh mengandung link / nomor telepon!';
            showStatus(msg, 'error');
            setTimeout(hideStatus, 3500);
            return;
        }

        if (captionVal) {
            const captionCheck = moderateText(captionVal);
            if (!captionCheck.allow) {
                captionInput.focus();
                let msg = 'Caption mengandung kata yang tidak pantas!';
                if (captionCheck.hateWords.length > 0) msg = 'Caption mengandung ujaran kebencian!';
                if (captionCheck.provocationWords.length > 0) msg = 'Caption mengandung kata bernuansa provokasi/kekerasan!';
                if (captionCheck.spam.isSpam) msg = 'Caption tidak boleh mengandung link / nomor telepon / promosi!';
                showStatus(msg, 'error');
                setTimeout(hideStatus, 3500);
                return;
            }
        }
    } else if (typeof containsBadWords === 'function') {
        if (containsBadWords(namaVal)) {
            namaInput.focus();
            showStatus('Nama mengandung kata yang tidak pantas!', 'error');
            setTimeout(hideStatus, 3500);
            return;
        }

        if (captionVal && containsBadWords(captionVal)) {
            captionInput.focus();
            showStatus('Caption mengandung kata yang tidak pantas!', 'error');
            setTimeout(hideStatus, 3500);
            return;
        }
    }

    goToStep(2);
    // Inisialisasi editor Twibbon dengan border terpilih
    initEditor(selectedBorderId);
});

// Step 2 -> Step 1
btnBackToStep1.addEventListener('click', () => {
    goToStep(1);
});

// Event listener untuk tombol pilihan border di Step 2
borderButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const borderId = parseInt(btn.dataset.borderId, 10);
        selectedBorderId = borderId;

        // Ganti class active ke tombol yang sedang diklik
        borderButtons.forEach(b => b.classList.toggle('active', b === btn));

        // Inisialisasi ulang editor dengan border baru & render nama otomatis
        initEditor(borderId);
    });
});

// =============================================
// UI HELPERS
// =============================================

/**
 * Tampilkan pesan status kepada user.
 * @param {string} message  - Teks yang ditampilkan
 * @param {'loading'|'success'|'error'} type - Tipe styling
 */
function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status visible ${type}`;
}

/** Sembunyikan status message */
function hideStatus() {
    statusEl.className = 'status';
}

/**
 * Set state loading pada tombol submit.
 * @param {boolean} isLoading
 */
function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
        submitBtn.classList.add('loading-state');
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = 'Mengirim...';
    } else {
        submitBtn.classList.remove('loading-state');
        submitBtn.textContent = submitBtn.dataset.originalText || 'Kirim ke Proyektor 🚀';
    }
}

// =============================================
// COMPRESSION OPTIONS
// =============================================
const COMPRESSION_OPTIONS = {
    maxSizeMB: 0.2,   // Maksimal 200KB agar Unity tidak berat
    maxWidthOrHeight: 512,   // Maksimal resolusi 512px
    useWebWorker: true,  // Non-blocking di main thread
};

// =============================================
// CORE UPLOAD FUNCTIONS
// =============================================

/**
 * Kompres gambar (Blob/File) sebelum di-upload.
 * @param {Blob} blob - Gambar dari canvas capture
 * @returns {Promise<File>}
 */
async function compressImage(blob) {
    showStatus('Mengompres gambar...', 'loading');
    // imageCompression menerima File, bungkus Blob dulu sebagai PNG agar transparansi terjaga
    const file = new File([blob], 'selfie.png', { type: 'image/png' });
    return await imageCompression(file, COMPRESSION_OPTIONS);
}

/**
 * Upload file ke Supabase Storage dan kembalikan public URL-nya.
 * @param {File} compressedFile
 * @returns {Promise<string>} - Public URL
 */
async function uploadToStorage(compressedFile) {
    showStatus('Mengunggah foto ke Storage...', 'loading');

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.png`;

    const { error: storageError } = await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, compressedFile);

    if (storageError) throw storageError;

    const { data: urlData } = supabaseClient.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fileName);

    return urlData.publicUrl;
}

/**
 * Simpan metadata pengunjung ke tabel database.
 * @param {string} nama
 * @param {string} caption
 * @param {string} imageUrl
 */
async function saveToDatabase(nama, caption, imageUrl) {
    showStatus('Menyimpan data ke Database...', 'loading');

    const { error: dbError } = await supabaseClient
        .from(DB_TABLE)
        .insert([{ nama, caption, image_url: imageUrl }]);

    if (dbError) throw dbError;
}

// =============================================
// FORM SUBMIT HANDLER
// =============================================
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nama = document.getElementById('nama').value.trim();
    const caption = document.getElementById('caption').value.trim();

    if (nama.length > 10) {
        showStatus('Nama maksimal 10 huruf!', 'error');
        return;
    }

    if (caption.length > 85) {
        showStatus('Caption maksimal 85 karakter!', 'error');
        return;
    }

    // Validasi Moderasi Konten pada Submit
    if (typeof moderateText === 'function') {
        const namaCheck = moderateText(nama);
        if (!namaCheck.allow) {
            showStatus('Nama mengandung kata yang tidak pantas / dilarang!', 'error');
            return;
        }
        if (caption) {
            const captionCheck = moderateText(caption);
            if (!captionCheck.allow) {
                showStatus('Caption mengandung konten yang tidak diperbolehkan!', 'error');
                return;
            }
        }
    } else if (typeof containsBadWords === 'function') {
        if (containsBadWords(nama)) {
            showStatus('Nama mengandung kata yang tidak pantas!', 'error');
            return;
        }
        if (caption && containsBadWords(caption)) {
            showStatus('Caption mengandung kata yang tidak pantas!', 'error');
            return;
        }
    }

    if (!editor.photoImg) {
        showStatus('Ambil foto selfie terlebih dahulu!', 'error');
        return;
    }

    setLoading(true);
    hideStatus();

    try {
        // Bake final composite (foto + border + stiker dari Step 2)
        showStatus('Memproses gambar...', 'loading');
        await bakeEditorToCapture();

        if (!capturedBlob) {
            throw new Error('Gagal memproses gambar, coba lagi.');
        }

        // Tampilkan Cosmic Loading Screen animasi kosmik yang smooth
        goToStep('loading');

        // Kompres gambar
        const compressed = await compressImage(capturedBlob);

        // Upload ke Supabase Storage & Simpan metadata ke database secara paralel/berurutan
        const imageUrl = await uploadToStorage(compressed);
        await saveToDatabase(nama, caption, imageUrl);

        // Beri waktu jeda animasi kosmik (~1.8 detik) agar transisi terasa smooth dan tidak kaku
        await new Promise(resolve => setTimeout(resolve, 1800));

        // Reset semua state form & editor
        form.reset();
        capturedBlob = null;
        rawImageSrc = null;
        compositeImg = null;
        capturedImg.src = '';
        btnGoToStep2.disabled = true;
        selectedBorderId = 1;
        editor.photoImg = null;
        sticker.text = '';
        sticker.hasCustomPos = false;
        // Reset border button active ke Frame 1
        borderButtons.forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.borderId, 10) === 1));
        // Clear canvas
        if (editorCanvas) {
            const ctx = editorCanvas.getContext('2d');
            ctx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
        }
        if (stickerCanvas) {
            const ctx = stickerCanvas.getContext('2d');
            ctx.clearRect(0, 0, stickerCanvas.width, stickerCanvas.height);
        }
        setCameraState('idle');

        // Pindah dengan mulus ke Ending / Thank You Screen
        goToStep(3);

    } catch (error) {
        console.error('[app.js] Upload error:', error);
        // Kembalikan ke Step 2 jika terjadi error
        goToStep(2);
        showStatus(`Gagal: ${error.message}`, 'error');

    } finally {
        setLoading(false);
    }
});

