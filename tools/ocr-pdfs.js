const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { createWorker } = require('tesseract.js');

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
  const outDir = path.join(process.cwd(), 'tmp', 'pdf-ocr');
  fs.mkdirSync(outDir, { recursive: true });

  const worker = await createWorker('eng');

  for (const file of files) {
    const base = path.basename(file).replace(/\.pdf$/i, '');
    const outPath = path.join(outDir, base + '.txt');

    try {
      const parser = new PDFParse({ data: fs.readFileSync(file) });
      const info = await parser.getInfo();
      const total = info.total || 0;

      let text = '';
      for (let page = 1; page <= total; page++) {
        const shot = await parser.getScreenshot({
          partial: [page],
          scale: 1.5,
          imageDataUrl: false,
          imageBuffer: true,
        });
        const img = shot.pages?.[0]?.data;
        if (!img) continue;

        const { data } = await worker.recognize(img);
        text += `\n\n-- Page ${page} --\n` + (data.text || '') + '\n';
        console.log(`${base}: page ${page}/${total}`);
      }

      await parser.destroy();
      fs.writeFileSync(outPath, text, 'utf8');
      console.log(`OK: ${base} -> ${outPath}`);
    } catch (err) {
      console.error(`FAIL: ${base} -> ${err.message}`);
    }
  }

  await worker.terminate();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
