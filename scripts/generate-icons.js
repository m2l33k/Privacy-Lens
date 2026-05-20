/**
 * Generates Privacy Lens PNG icons using pure Node.js (no canvas dependency).
 * Writes minimal valid PNG files for 16x16, 48x48, and 128x128.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function writePNG(filePath, size) {
  // We'll create a simple SVG-like icon: dark background + cyan circle lens
  const bg = [0x1A, 0x1A, 0x1B, 0xFF];   // #1A1A1B opaque
  const fg = [0x00, 0xD1, 0xFF, 0xFF];    // #00D1FF opaque
  const ring = [0x00, 0xD1, 0xFF, 0xCC];  // cyan with alpha
  const mid = Math.floor(size / 2);
  const outerR = Math.floor(size * 0.38);
  const innerR = Math.floor(size * 0.22);

  // Build RGBA pixel buffer
  const pixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - mid;
      const dy = y - mid;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (dist <= innerR) {
        // Lens interior — slightly lighter dark
        pixels[idx]     = 0x2C;
        pixels[idx + 1] = 0x2C;
        pixels[idx + 2] = 0x32;
        pixels[idx + 3] = 0xFF;
      } else if (dist <= outerR) {
        // Ring
        const t = (dist - innerR) / (outerR - innerR);
        const alpha = t < 0.15 || t > 0.85 ? 0xFF : Math.round(0xCC * (1 - Math.abs(t - 0.5) * 1.5));
        pixels[idx]     = ring[0];
        pixels[idx + 1] = ring[1];
        pixels[idx + 2] = ring[2];
        pixels[idx + 3] = Math.min(0xFF, alpha);
      } else {
        // Background
        pixels[idx]     = bg[0];
        pixels[idx + 1] = bg[1];
        pixels[idx + 2] = bg[2];
        pixels[idx + 3] = bg[3];
      }
    }
  }

  // ── Build PNG ──────────────────────────────────────────────────────────────

  function crc32(buf) {
    const table = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
      }
      return t;
    })();
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.allocUnsafe(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.allocUnsafe(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
    return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 6;  // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // IDAT — filter byte (0) + raw pixels per row
  const pixBuf = Buffer.from(pixels.buffer);
  const rawRows = Buffer.allocUnsafe(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    rawRows[y * (1 + size * 4)] = 0; // filter type None
    pixBuf.copy(rawRows, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const compressed = zlib.deflateSync(rawRows, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(filePath, png);
  console.log(`  ✓ ${path.basename(filePath)} (${size}×${size})`);
}

const outDir = path.join(__dirname, '..', 'src', 'icons');
fs.mkdirSync(outDir, { recursive: true });

console.log('Generating icons…');
writePNG(path.join(outDir, 'icon16.png'),  16);
writePNG(path.join(outDir, 'icon48.png'),  48);
writePNG(path.join(outDir, 'icon128.png'), 128);
console.log('Done.');
