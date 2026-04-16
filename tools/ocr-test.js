const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { createWorker } = require('tesseract.js');

const file = "c:/Users/heinh/OneDrive/Desktop/Downloads/MAD_Week10 Performance Cost and Reliabiility.pdf";

async function run() {
  const parser = new PDFParse({ data: fs.readFileSync(file) });
  const shots = await parser.getScreenshot({ first: 1, last: 1, scale: 1.5, imageDataUrl: false });
  await parser.destroy();
  const img = shots.pages[0].data;
  const outImg = path.join(process.cwd(), 'tmp', 'ocr-test-page1.png');
  fs.mkdirSync(path.dirname(outImg), { recursive: true });
  fs.writeFileSync(outImg, img);

  const worker = await createWorker('eng');
  const { data } = await worker.recognize(img);
  await worker.terminate();

  console.log(data.text.slice(0, 2000));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
