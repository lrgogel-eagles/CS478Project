const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..', 'public', 'dice-models');
const repo = path.join(root, 'PolyhedralDice');
fs.mkdirSync(root, { recursive: true });
if (!fs.existsSync(repo)) {
  console.log('Downloading CC0 PolyhedralDice assets from GitHub...');
  execFileSync('git', ['clone', '--depth', '1', 'https://github.com/tse-wei-chen/PolyhedralDice.git', repo], { stdio: 'inherit' });
}
const files = [];
function walk(folder) {
  for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
    if (item.name === '.git') continue;
    const full = path.join(folder, item.name);
    if (item.isDirectory()) walk(full);
    else if (/\.(gltf|glb)$/i.test(item.name)) files.push(full);
  }
}
walk(repo);
const manifest = {};
for (const file of files) {
  const normalized = path.relative(repo, file).replace(/\\/g, '/');
  const filename = path.basename(file).toLowerCase();
  for (const die of ['d100','d20','d12','d10','d8','d6','d4']) {
    if (new RegExp(`(^|[^a-z0-9])${die}([^0-9]|$)`).test(filename) && !manifest[die]) {
      manifest[die] = '/dice-models/PolyhedralDice/' + normalized;
    }
  }
  if (/percent|d00|d10_00/i.test(filename)) manifest.d100 = '/dice-models/PolyhedralDice/' + normalized;
}
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Found', files.length, 'model files. Mapped:', Object.keys(manifest).join(', ') || '(none)');
console.log('Check public/dice-models/manifest.json. If the asset names differ, map each die manually.');
