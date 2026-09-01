# 🤖 Interactive Video Mapping — Website Vidmap

Website upload selfie untuk proyeksi interaktif. Pengunjung bisa mengambil foto langsung dari kamera browser (WebRTC), dan foto akan muncul di layar proyeksi.

## ✨ Fitur

- 📷 **Live Camera** via WebRTC (`getUserMedia`)
- 🔄 **Flip Kamera** (depan ↔ belakang)
- ⚡ **Kompresi otomatis** sebelum upload (max 200KB)
- ☁️ **Upload ke Supabase Storage**
- 🗄️ **Simpan metadata** ke Supabase Database
- 📱 **Responsive** — mobile & desktop

## 📁 Struktur Folder

```
Website Vidmap/
├── index.html          ← Halaman utama
├── css/
│   └── style.css       ← Vanilla CSS design system
├── js/
│   ├── env.example.js  ← Template konfigurasi (commit ini)
│   ├── env.js          ← Kredensial aktual (GITIGNORED)
│   ├── config.js       ← Init Supabase client
│   └── app.js          ← Logic WebRTC + upload
├── .env.example        ← Template .env untuk referensi
├── .gitignore
└── README.md
```

## 🚀 Setup untuk Developer Baru

### 1. Clone repo

```bash
git clone https://github.com/USERNAME/website-vidmap.git
cd website-vidmap
```

### 2. Buat file environment

```bash
# Salin template
cp js/env.example.js js/env.js
```

### 3. Isi kredensial Supabase

Buka `js/env.js` dan isi dengan kredensial kamu:

```js
const ENV = {
    SUPABASE_URL:      "https://your-project-id.supabase.co",
    SUPABASE_ANON_KEY: "your_anon_key_here",
    DB_TABLE:          "pengunjung",
    STORAGE_BUCKET:    "foto-robot",
};
```

Dapatkan kredensial dari: **[Supabase Dashboard](https://supabase.com/dashboard) → Settings → API**

### 4. Jalankan Server Lokal (Node.js)

```bash
# Install dependencies (sekali saja)
npm install

# Jalankan server
npm start
```

Server akan menampilkan URL di terminal:

```
🔒 HTTPS Server berjalan!

  💻 PC      → https://localhost:3000
  📱 HP/LAN  → https://192.168.x.x:3000
```

#### Akses dari HP

1. Pastikan HP dan PC terhubung ke **WiFi yang sama**
2. Buka browser HP dan akses `https://192.168.x.x:3000` (ganti IP sesuai yang tampil di terminal)
3. Jika muncul peringatan **"Your connection is not private"**:
   - Di Chrome: Ketik `thisisunsafe` (langsung tanpa klik apa-apa)
   - Atau: Klik **Advanced** → **Proceed to ... (unsafe)**

#### Setup Certificate (opsional, agar browser tidak warning)

Jalankan sekali sebagai Administrator untuk install CA yang dipercaya browser:

```bash
# Di PowerShell sebagai Administrator:
mkcert -install
```

Lalu di HP Android, install CA certificate dari:
`%LOCALAPPDATA%\mkcert\rootCA.pem`

> ⚠️ `getUserMedia` (WebRTC) membutuhkan **HTTPS** atau **localhost**. Tidak akan bekerja di `file://` atau `http://`.

## 🗄️ Supabase Setup

### Tabel Database

```sql
create table pengunjung (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  nama        text not null,
  caption     text,
  image_url   text not null
);
```

### Storage Bucket

1. Buat bucket bernama `foto-robot`
2. Set sebagai **Public bucket**
3. Tambahkan policy untuk allow anonymous upload:

```sql
-- Allow anon upload
create policy "Allow anon upload"
on storage.objects for insert
to anon
with check (bucket_id = 'foto-robot');
```

## 🔐 Keamanan

| File | Git Status | Keterangan |
|------|-----------|------------|
| `js/env.js` | ❌ Gitignored | Kredensial aktual |
| `js/env.example.js` | ✅ Committed | Template tanpa kredensial |
| `.env` | ❌ Gitignored | Dokumentasi lokal |
| `.env.example` | ✅ Committed | Template referensi |

## 🚀 Deployment ke Vercel

Karena aplikasi ini menggunakan kamera (WebRTC), browser membutuhkan koneksi **HTTPS** yang aman agar kamera dapat dibuka di HP. Vercel secara otomatis menyediakan koneksi HTTPS gratis untuk proyek kamu!

### Langkah-langkah Deploy:

1. **Hubungkan Repo GitHub ke Vercel**:
   - Masuk ke dashboard [Vercel](https://vercel.com).
   - Klik **Add New** → **Project**, lalu impor repository GitHub proyek ini.

2. **Atur Environment Variables**:
   Sebelum klik **Deploy**, buka menu **Environment Variables** di Vercel dan tambahkan key-value berikut sesuai kredensial Supabase kamu:
   - `SUPABASE_URL` = `https://your-project-id.supabase.co`
   - `SUPABASE_ANON_KEY` = `your_anon_key_here`
   - `DB_TABLE` = `pengunjung` (opsional, default: `pengunjung`)
   - `STORAGE_BUCKET` = `foto-robot` (opsional, default: `foto-robot`)

3. **Deploy!** 🚀
   - Klik **Deploy**. Vercel akan otomatis mendeteksi script build di `package.json` untuk membuat file `js/env.js` dari Environment Variables di atas secara otomatis sebelum website ditayangkan.
   - Setelah sukses, buka URL yang diberikan oleh Vercel di HP kamu (misalnya `https://your-project.vercel.app`). Fitur kamera di HP akan langsung berfungsi dengan aman!

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS, Vanilla JS
- **Camera**: WebRTC `getUserMedia` API
- **Backend**: [Supabase](https://supabase.com) (Storage + PostgreSQL)
- **Deployment**: [Vercel](https://vercel.com)
- **Compression**: [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)
