const sharp = require('sharp');
const path  = require('path');

const src   = path.join(__dirname, '../src/icons/icons.png');
const sizes = [16, 48, 128];

Promise.all(
  sizes.map(size =>
    sharp(src)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(__dirname, `../src/icons/icon${size}.png`))
      .then(() => console.log(`icon${size}.png done`))
  )
).catch(err => { console.error(err); process.exit(1); });
