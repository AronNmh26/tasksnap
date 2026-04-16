const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');

const files = [
  "c:/Users/heinh/OneDrive/Desktop/Downloads/MAD_Week13 Product Thinking and Continuous Inprovement.pdf",
  "c:/Users/heinh/OneDrive/Desktop/Downloads/MAD_Week12 Deployment and App Distribution.pdf",
  "c:/Users/heinh/OneDrive/Desktop/Downloads/MAD_Week11 Testing and Quality Assesurance.pdf",
  "c:/Users/heinh/OneDrive/Desktop/Downloads/MAD_Week10 Performance Cost and Reliabiility.pdf",
  "c:/Users/heinh/OneDrive/Desktop/Downloads/MAD_Week09 Privacy PDPA and Personal Data.pdf",
  "c:/Users/heinh/OneDrive/Desktop/Downloads/MAD_Week08 Mobile Security Fundamentals.pdf",
  "c:/Users/heinh/OneDrive/Desktop/Downloads/MAD_Week07 Code Review Debuging & Refactoring.pdf",
];

async function run() {
  const outDir = path.join(process.cwd(), 'tmp', 'pdf-text');
  fs.mkdirSync(outDir, { recursive: true });

  for (const file of files) {
    const base = path.basename(file).replace(/\.pdf$/i, '');
    const outPath = path.join(outDir, base + '.txt');
    try {
      const parser = new PDFParse({ data: fs.readFileSync(file) });
      const result = await parser.getText();
      await parser.destroy();
      fs.writeFileSync(outPath, result.text || '', 'utf8');
      console.log(`OK: ${base} -> ${outPath}`);
    } catch (err) {
      console.error(`FAIL: ${base} -> ${err.message}`);
    }
  }
}

run();
