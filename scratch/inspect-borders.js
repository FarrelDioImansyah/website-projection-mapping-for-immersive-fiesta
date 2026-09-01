const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;

const bordersDir = path.join(__dirname, '..', 'assets', 'borders');

for (let i = 1; i <= 5; i++) {
    const filePath = path.join(bordersDir, `BORDER_${i}.png`);
    const png = PNG.sync.read(fs.readFileSync(filePath));
    const w = png.width, h = png.height;
    
    // Scan inner edge of the top/left/right arc
    // Find all boundary pixels where opaque border meets inner transparent hole
    let innerEdgePoints = [];
    for (let y = 100; y < 900; y++) {
        for (let x = 400; x < 1500; x++) {
            let idx = (w * y + x) * 4;
            let a = png.data[idx + 3];
            // If transparent (<50) and has a neighbor that is opaque (>150)
            if (a < 50) {
                let neighbors = [
                    (w * (y-1) + x) * 4 + 3,
                    (w * (y+1) + x) * 4 + 3,
                    (w * y + (x-1)) * 4 + 3,
                    (w * y + (x+1)) * 4 + 3,
                ];
                if (neighbors.some(na => png.data[na] > 150)) {
                    innerEdgePoints.push({ x, y });
                }
            }
        }
    }
    
    console.log(`\n=== BORDER_${i} ===`);
    console.log(`Total inner edge points: ${innerEdgePoints.length}`);
    
    // Fit circle/ellipse using top arc points (y < 700 to avoid bottom banner)
    let arcPoints = innerEdgePoints.filter(p => p.y < 700 && p.y > 150);
    // Find minX, maxX, minY of the inner hole
    let minX = Math.min(...arcPoints.map(p => p.x));
    let maxX = Math.max(...arcPoints.map(p => p.x));
    let minY = Math.min(...arcPoints.map(p => p.y));
    
    console.log(`Top arc bounds: X[${minX}, ${maxX}] (w=${maxX-minX}), minY=${minY}`);
    
    // Estimate circle center: cx = (minX + maxX)/2, cy = minY + radius
    let radius = (maxX - minX) / 2;
    let cx = (minX + maxX) / 2;
    let cy = minY + radius;
    console.log(`Estimated Circle: cx=${cx.toFixed(1)}, cy=${cy.toFixed(1)}, r=${radius.toFixed(1)}`);
}
