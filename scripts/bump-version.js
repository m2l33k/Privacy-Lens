const fs   = require('fs');
const path = require('path');

const pkg      = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));

manifest.version = pkg.version;

fs.writeFileSync(
  path.join(__dirname, '../manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);

console.log(`manifest.json version → ${pkg.version}`);
