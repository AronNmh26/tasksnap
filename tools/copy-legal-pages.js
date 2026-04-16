const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'legal-pages');
const distDir = path.join(root, 'dist');

const files = ['privacy-policy.html', 'data-deletion.html'];

function ensureDist() {
  if (!fs.existsSync(distDir)) {
    throw new Error('dist folder not found. Run expo export before copying legal pages.');
  }
}

function copyFiles() {
  ensureDist();

  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(distDir, file);

    if (!fs.existsSync(src)) {
      throw new Error(`Missing source legal page: ${src}`);
    }

    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} -> dist/${file}`);
  }
}

try {
  copyFiles();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
