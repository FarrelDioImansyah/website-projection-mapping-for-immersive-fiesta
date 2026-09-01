/**
 * server.js — Local HTTPS Dev Server
 * ====================================
 * Menjalankan website secara lokal dengan HTTPS agar fitur kamera
 * (WebRTC getUserMedia) bisa bekerja di browser HP di jaringan WiFi.
 *
 * Cara pakai:
 *   1. Install dependencies: npm install
 *   2. (Sekali) Generate SSL cert: npm run setup-cert
 *   3. Jalankan server: npm start
 *   4. Buka di PC:  https://localhost:3000
 *   5. Buka di HP:  https://<IP-PC>:3000
 *      (Saat muncul peringatan "Not Secure", pilih Advanced → Proceed)
 */

const express = require('express');
const https   = require('https');
const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), {
    // Cache 0 untuk development agar perubahan langsung terlihat
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
}));

// Fallback ke index.html untuk SPA-style routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Helper: ambil IP LAN ──────────────────────────────────────────────────────
function getLocalIP() {
    const ifaces = os.networkInterfaces();
    const ips = [];
    Object.values(ifaces).forEach(list => {
        list.forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        });
    });
    return ips;
}

// ── Cek ketersediaan SSL cert ─────────────────────────────────────────────────
const certFiles = {
    // mkcert menghasilkan file dengan nama ini di folder project
    key:  path.join(__dirname, 'localhost+1-key.pem'),
    cert: path.join(__dirname, 'localhost+1.pem'),
};

// Coba juga nama alternatif (jika IP dimasukkan ke cert)
const altCertFiles = {
    key:  path.join(__dirname, 'cert-key.pem'),
    cert: path.join(__dirname, 'cert.pem'),
};

let sslOptions = null;

if (fs.existsSync(certFiles.key) && fs.existsSync(certFiles.cert)) {
    sslOptions = {
        key:  fs.readFileSync(certFiles.key),
        cert: fs.readFileSync(certFiles.cert),
    };
} else if (fs.existsSync(altCertFiles.key) && fs.existsSync(altCertFiles.cert)) {
    sslOptions = {
        key:  fs.readFileSync(altCertFiles.key),
        cert: fs.readFileSync(altCertFiles.cert),
    };
}

// ── Start server ──────────────────────────────────────────────────────────────
const localIPs = getLocalIP();

if (sslOptions) {
    // HTTPS server — kamera HP bisa bekerja
    https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
        console.log('\n🔒 HTTPS Server berjalan!\n');
        console.log(`  💻 PC      → https://localhost:${PORT}`);
        localIPs.forEach(ip => {
            console.log(`  📱 HP/LAN  → https://${ip}:${PORT}`);
        });
        console.log('\n  ⚠️  Jika browser tampilkan peringatan "Not Secure":');
        console.log('     Pilih "Advanced" → "Proceed to ... (unsafe)"\n');
    });
} else {
    // HTTP fallback — kamera mungkin tidak bekerja di HP
    http.createServer(app).listen(PORT, '0.0.0.0', () => {
        console.log('\n⚠️  HTTP Server berjalan (tanpa HTTPS)\n');
        console.log('  ⚠️  Kamera HP kemungkinan TIDAK bekerja via HTTP!');
        console.log('  💡 Jalankan "npm run setup-cert" dulu untuk HTTPS.\n');
        console.log(`  💻 PC      → http://localhost:${PORT}`);
        localIPs.forEach(ip => {
            console.log(`  📱 HP/LAN  → http://${ip}:${PORT}`);
        });
        console.log();
    });
}
