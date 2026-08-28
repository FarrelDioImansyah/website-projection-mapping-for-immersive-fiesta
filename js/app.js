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
const form      = document.getElementById('uploadForm');
const statusEl  = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');

// Camera DOM Elements
const cameraIdle    = document.getElementById('cameraIdle');
const cameraPreview = document.getElementById('cameraPreview');
const photoResult   = document.getElementById('photoResult');
const videoEl       = document.getElementById('cameraVideo');
const captureCanvas = document.getElementById('captureCanvas');
const capturedImg   = document.getElementById('capturedImg');

const btnOpenCamera   = document.getElementById('btnOpenCamera');
const btnCapture      = document.getElementById('btnCapture');
const btnCancelCamera = document.getElementById('btnCancelCamera');
const btnFlipCamera   = document.getElementById('btnFlipCamera');
const btnRetake       = document.getElementById('btnRetake');

// =============================================
// CAMERA STATE
// =============================================
let mediaStream    = null;   // Active MediaStream
let capturedBlob   = null;   // Captured photo as Blob (used for upload)
let facingMode     = 'user'; // 'user' = depan, 'environment' = belakang

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
            width:  { ideal: 1280 },
            height: { ideal: 720 },
        },
        audio: false,
    };

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl.srcObject = mediaStream;
        setCameraState('preview');
    } catch (err) {
        console.error('[Camera] getUserMedia error:', err);
        let msg = 'Tidak bisa mengakses kamera.';
        if (err.name === 'NotAllowedError')  msg = 'Akses kamera ditolak. Izinkan kamera di browser kamu.';
        if (err.name === 'NotFoundError')    msg = 'Kamera tidak ditemukan di perangkat ini.';
        if (err.name === 'NotReadableError') msg = 'Kamera sedang digunakan aplikasi lain.';
        showStatus(msg, 'error');
    }
}

/** Hentikan semua track pada stream aktif */
function stopStream() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream   = null;
        videoEl.srcObject = null;
    }
}

/** Ambil foto dari frame video saat ini menggunakan canvas */
function capturePhoto() {
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;

    captureCanvas.width  = w;
    captureCanvas.height = h;

    const ctx = captureCanvas.getContext('2d');

    // Mirror jika kamera depan (agar preview natural)
    if (facingMode === 'user') {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(videoEl, 0, 0, w, h);

    // Flash animation
    flashEffect();

    // Convert canvas ke Blob (JPEG)
    captureCanvas.toBlob((blob) => {
        capturedBlob = blob;
        capturedImg.src = URL.createObjectURL(blob);
        stopStream();
        setCameraState('result');
    }, 'image/jpeg', 0.92);
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
// CAMERA EVENT LISTENERS
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
    setCameraState('idle');
    hideStatus();
});

btnFlipCamera.addEventListener('click', () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(); // Restart dengan kamera yang berbeda
});

btnRetake.addEventListener('click', () => {
    capturedBlob = null;
    capturedImg.src = '';
    startCamera();
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
    statusEl.className   = `status visible ${type}`;
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
    maxSizeMB:        0.2,   // Maksimal 200KB agar Unity tidak berat
    maxWidthOrHeight: 512,   // Maksimal resolusi 512px
    useWebWorker:     true,  // Non-blocking di main thread
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
    // imageCompression menerima File, bungkus Blob dulu
    const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
    return await imageCompression(file, COMPRESSION_OPTIONS);
}

/**
 * Upload file ke Supabase Storage dan kembalikan public URL-nya.
 * @param {File} compressedFile
 * @returns {Promise<string>} - Public URL
 */
async function uploadToStorage(compressedFile) {
    showStatus('Mengunggah foto ke Storage...', 'loading');

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

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

    const nama    = document.getElementById('nama').value.trim();
    const caption = document.getElementById('caption').value.trim();

    // Pastikan ada foto yang sudah di-capture
    if (!capturedBlob) {
        showStatus('Ambil foto selfie terlebih dahulu! 📷', 'error');
        return;
    }

    setLoading(true);
    hideStatus();

    try {
        // Step 1: Kompres gambar dari blob kamera
        const compressed = await compressImage(capturedBlob);

        // Step 2: Upload ke Supabase Storage
        const imageUrl = await uploadToStorage(compressed);

        // Step 3: Simpan metadata ke database
        await saveToDatabase(nama, caption, imageUrl);

        // Sukses!
        showStatus('Berhasil dikirim! Robot kamu sedang bersiap 🤖', 'success');

        // Reset semua state
        form.reset();
        capturedBlob = null;
        capturedImg.src = '';
        setCameraState('idle');

    } catch (error) {
        console.error('[app.js] Upload error:', error);
        showStatus(`Gagal: ${error.message}`, 'error');

    } finally {
        setLoading(false);
    }
});
