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

### 4. Buka di browser

Buka `index.html` langsung di browser, atau gunakan live server:

```bash
# Menggunakan VS Code Live Server, atau:
npx serve .
```

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

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS, Vanilla JS
- **Camera**: WebRTC `getUserMedia` API
- **Backend**: [Supabase](https://supabase.com) (Storage + PostgreSQL)
- **Compression**: [browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)
