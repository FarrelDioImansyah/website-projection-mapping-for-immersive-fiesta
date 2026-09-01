const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

const bordersDir = path.join(__dirname, '..', 'assets', 'borders');

for (let i = 4; i <= 5; i++) {
    const png = PNG.sync.read(fs.readFileSync(path.join(bordersDir, `BORDER_${i}.png`)));
    const w = png.width, h = png.height;
    
    // Find outer transparent pixels
    const outer = new Uint8Array(w * h);
    let queue = [];
    for (let x = 0; x < w; x++) { queue.push(x); queue.push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { queue.push(y * w); queue.push(y * w + (w - 1)); }
    for (let q of queue) outer[q] = 1;
    let head = 0;
    while(head < queue.length) {
        let idx = queue[head++];
        let py = Math.floor(idx / w), px = idx % w;
        if (px > 0 && !outer[idx-1] && png.data[(idx-1)*4+3] < 50) { outer[idx-1] = 1; queue.push(idx-1); }
        if (px < w-1 && !outer[idx+1] && png.data[(idx+1)*4+3] < 50) { outer[idx+1] = 1; queue.push(idx+1); }
        if (py > 0 && !outer[idx-w] && png.data[(idx-w)*4+3] < 50) { outer[idx-w] = 1; queue.push(idx-w); }
        if (py < h-1 && !outer[idx+w] && png.data[(idx+w)*4+3] < 50) { outer[idx+w] = 1; queue.push(idx+w); }
    }
    
    let outerEdge = [];
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let idx = y * w + x;
            if (outer[idx] && (!outer[idx-1] || !outer[idx+1] || !outer[idx-w] || !outer[idx+w])) {
                outerEdge.push({x, y});
            }
        }
    }
    
    // Check roundRect fitting
    let cx = i === 4 ? 993 : 928;
    let cy = i === 4 ? 574 : 550;
    
    let best = null;
    let maxArea = 0;
    for (let bw = 680; bw <= 750; bw += 2) {
        for (let bh = 680; bh <= 750; bh += 2) {
            for (let rad = 110; rad <= 160; rad += 5) {
                let x0 = cx - bw / 2;
                let y0 = cy - bh / 2;
                // Test distance from all outerEdge points to roundRect
                let leak = false;
                for (let p of outerEdge) {
                    let dx = Math.max(x0 + rad - p.x, 0, p.x - (x0 + bw - rad));
                    let dy = Math.max(y0 + rad - p.y, 0, p.y - (y0 + bh - rad));
                    if (dx * dx + dy * dy < (rad + 3) * (rad + 3) && p.x >= x0 - 3 && p.x <= x0 + bw + 3 && p.y >= y0 - 3 && p.y <= y0 + bh + 3) {
                        leak = true;
                        break;
                    }
                }
                if (!leak && bw * bh > maxArea) {
                    maxArea = bw * bh;
                    best = { x0, y0, bw, bh, rad };
                }
            }
        }
    }
    console.log(`BORDER_${i} best roundRect: x=${best.x0.toFixed(1)}, y=${best.y0.toFixed(1)}, w=${best.bw}, h=${best.bh}, r=${best.rad}`);
}
