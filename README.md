# IMMERSIVE FIESTA 2026 — Interactive Projection Mapping Web App

Web application interaktif untuk pengunjung pameran dan pertunjukan **Immersive Fiesta 2026** (TRM - Politeknik Elektronika Negeri Surabaya). 

Aplikasi ini memungkinkan pengunjung mengambil foto selfie secara *real-time*, memilih frame/twibbon bertema visual Immersive Fiesta, mengatur stiker nama kustom, dan mengirimkan hasilnya langsung ke sistem proyeksi video mapping di panggung/layar utama.

---

## 🌟 Tentang Proyek

Dalam instalasi seni digital dan video mapping interaktif, keterlibatan audiens adalah elemen utama. Web app ini berfungsi sebagai jembatan interaksi antara pengunjung dengan pertunjukan visual:

1. **Pengunjung** mengakses web app melalui smartphone mereka (scan QR code di venue acara).
2. **Kamera WebRTC** menangkap foto selfie pengunjung langsung dari browser tanpa perlu menginstal aplikasi tambahan.
3. **Editor Kanvas Interaktif** memungkinkan pengunjung menyesuaikan posisi foto, zoom in/out di dalam frame twibbon, serta menempelkan stiker nama.
4. **Pengiriman Real-time**: Foto yang sudah di-composite dikompres otomatis dan dikirim ke cloud storage (Supabase), yang secara instan ditarik oleh software video mapping proyektor (misal: TouchDesigner / Resolume / Web Display) untuk dimunculkan sebagai bagian dari pertunjukan visual.

---

## 🚀 Alur Pengalaman Pengguna (3 Langkah)

1. **Langkah 1: Input Data & Foto Selfie**
   - Mengisi Nama dan Caption/Pesan singkat.
   - Mengambil foto selfie langsung via live camera WebRTC (dukungan kamera depan & belakang).
2. **Langkah 2: Atur Komposisi Foto & Pilihan Frame**
   - Memilih 5 desain frame/border unik khas Immersive Fiesta (atau mode Polos).
   - Fitur interaktif *drag-to-pan* (geser posisi foto) dan *pinch-to-zoom* / tombol kontrol zoom agar foto pas di dalam lubang frame.
3. **Langkah 3: Stiker Nama Kustom & Konfirmasi**
   - Menambahkan stiker nama di atas kanvas dengan opsi ukuran, rotasi (kemiringan), dan bebas digeser posisinya.
   - Preview hasil akhir sebelum dikirim langsung ke server proyektor.

---

## 🛠️ Tech Stack & Arsitektur

- **Frontend**: HTML5, Vanilla CSS3 (Design Tokens & Glassmorphism Theme), Vanilla JavaScript (Modular ES6).
- **Interactive Canvas Engine**: Custom HTML5 Canvas 2D composite engine (Real-time layering, masking, pinch/drag gestures, sticker rotation).
- **Kamera**: Browser WebRTC (`navigator.mediaDevices.getUserMedia`).
- **Kompresi Klien**: `browser-image-compression` (menjaga kualitas visual tetap tajam dengan ukuran file di bawah 300KB).
- **Backend & Database**: [Supabase](https://supabase.com) (PostgreSQL Database & Cloud Object Storage).
- **Local Server**: Node.js HTTPS server (mendukung pengujian kamera WebRTC di HP via jaringan lokal / WiFi).
- **Production Hosting**: [Vercel](https://vercel.com) (dengan SSL otomatis untuk WebRTC).

---

## 📁 Struktur Direktori

```text
Website Vidmap/
├── assets/
│   └── borders/          # File PNG asset frame/twibbon custom
├── css/
│   └── style.css         # Design system, tema nebula purple, dan responsivitas
├── js/
│   ├── env.example.js    # Template konfigurasi environment (commit ke git)
│   ├── env.js            # Kredensial aktif (dikecualikan oleh .gitignore)
│   ├── config.js         # Inisialisasi Supabase client
│   └── app.js            # Logika kamera, gesture canvas editor, dan upload
├── build.js              # Script build otomatis untuk Vercel (inject env)
├── server.js             # Local HTTPS server untuk pengujian di smartphone
├── vercel.json           # Konfigurasi rewrite & routing Vercel
├── .env.example          # Contoh variabel environment
├── .gitignore            # Pengabaian file sensitif dan temporary
├── package.json          # Script dan dependensi project
└── README.md             # Dokumentasi proyek
```

---

## 💻 Panduan Menjalankan di Komputer Lokal (Local Development)

### 1. Clone Repository
```bash
git clone https://github.com/FarrelDioImansyah/website-projection-mapping-for-immersive-fiesta.git
cd website-projection-mapping-for-immersive-fiesta
```

### 2. Konfigurasi Environment Variable
Salin file template konfigurasi:
```bash
cp js/env.example.js js/env.js
```
Buka `js/env.js` dan sesuaikan dengan kredensial project Supabase kamu:
```javascript
const ENV = {
    SUPABASE_URL: "https://PROJECT_ID.supabase.co",
    SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
    DB_TABLE: "pengunjung",
    STORAGE_BUCKET: "foto-robot"
};
```

### 3. Jalankan Local HTTPS Server
Kamera browser (WebRTC) mewajibkan koneksi aman (**HTTPS**). Project ini sudah dilengkapi server HTTPS lokal:
```bash
npm install
npm start
```
Terminal akan menampilkan alamat IP lokal, contoh:
```text
🔒 HTTPS Server berjalan!
  💻 PC      → https://localhost:3000
  📱 HP/LAN  → https://192.168.1.10:3000
```
Buka alamat tersebut di HP yang terhubung ke WiFi yang sama untuk langsung menguji fitur kamera selfie.

---

## ☁️ Konfigurasi Supabase

### Tabel Database (`pengunjung`)
```sql
create table pengunjung (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  nama text not null,
  caption text,
  image_url text not null
);
```

### Storage Bucket (`foto-robot`)
1. Buat bucket baru dengan nama `foto-robot` di menu **Storage**.
2. Aktifkan opsi **Public Bucket**.
3. Tambahkan Policy untuk mengizinkan pengunjung mengunggah foto tanpa login:
```sql
create policy "Allow anonymous insert"
on storage.objects for insert
to anon
with check (bucket_id = 'foto-robot');
```

---

## 🌐 Panduan Deployment ke Vercel

1. Hubungkan repository GitHub ini ke dashboard [Vercel](https://vercel.com).
2. Pada bagian **Environment Variables**, tambahkan:
   - `SUPABASE_URL` = `https://PROJECT_ID.supabase.co`
   - `SUPABASE_ANON_KEY` = `anon_key_kamu`
   - `DB_TABLE` = `pengunjung`
   - `STORAGE_BUCKET` = `foto-robot`
3. Klik **Deploy**. Script `build.js` akan otomatis membuat file `js/env.js` saat proses build berlangsung di server Vercel.

---

## 🎨 Branding & Kredit

- **Acara**: IMMERSIVE FIESTA 2026
- **Penyelenggara**: Program Studi Teknologi Rekayasa Multimedia (TRM) — Politeknik Elektronika Negeri Surabaya (PENS)
- **Tautan**: [trm.pens.ac.id](https://trm.pens.ac.id)

