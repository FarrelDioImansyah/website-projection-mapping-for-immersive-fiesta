// analyze-holes.js
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

const bordersDir = path.join('d:', 'Project dio sigma', 'Video mapping interactif', 'Website Vidmap', 'assets', 'borders');

function analyzeBorder(file) {
    const filePath = path.join(bordersDir, file);
    const data = fs.readFileSync(filePath);
    const png = PNG.sync.read(data);

    const w = png.width;
    const h = png.height;

    // Kita cari bounding box dari lubang transparan di tengah gambar.
    // Karena di sekeliling lubang ada frame yang opaque (alpha > 50),
    // kita scan pixel dari arah luar ke dalam, atau cari cluster transparansi (alpha < 50) di area tengah.
    
    // Mari cari titik-titik transparan yang berada di dekat pusat gambar
    // dan lacak batas kiri, kanan, atas, bawah dari cluster transparan pusat ini.
    let minX = w, maxX = 0, minY = h, maxY = 0;

    // Scan area tengah (misal dari 20% s.d 80% lebar/tinggi) untuk menemukan koordinat lubang
    for (let y = Math.round(h * 0.2); y < Math.round(h * 0.8); y++) {
        for (let x = Math.round(w * 0.2); x < Math.round(w * 0.8); x++) {
            const idx = (w * y + x) << 2;
            const alpha = png.data[idx + 3]; // Alpha channel (0-255)
            
            // Jika transparan (lubang helmet)
            if (alpha < 50) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // Hitung parameter elips dari bounding box lubang
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const diameterX = maxX - minX;
    const diameterY = maxY - minY;

    const rxRatio = (diameterX / 2) / w;
    const ryRatio = (diameterY / 2) / h;
    const cyRatio = centerY / h;

    console.log(`\n// ${file}`);
    console.log(`Dimensions: ${w}x${h}`);
    console.log(`Hole Box: X: ${minX} to ${maxX}, Y: ${minY} to ${maxY}`);
    console.log(`Config: { rx: ${rxRatio.toFixed(3)}, ry: ${ryRatio.toFixed(3)}, cy: ${cyRatio.toFixed(3)} },`);
}

console.log("Menganalisis lubang border...");
for (let i = 1; i <= 5; i++) {
    try {
        analyzeBorder(`BORDER_${i}.png`);
    } catch (err) {
        console.error(`Gagal menganalisis BORDER_${i}.png:`, err.message);
    }
}
