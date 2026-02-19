/**
 * Generate TaskSnap app icon PNGs.
 *
 * Usage:  node scripts/generate-icons.js
 *
 * Produces:
 *   assets/icon.png          (1024×1024)
 *   assets/adaptive-icon.png (1024×1024, no bg)
 *   assets/favicon.png       (48×48)
 *   assets/splash-icon.png   (512×512)
 *
 * Requires: npm install canvas  (dev-only, one-time)
 */

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

function drawIcon(ctx, s) {
  const r = s * 0.22;
  const cx = s / 2;
  const cy = s / 2;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, "#1E3A8A");
  grad.addColorStop(0.5, "#1152D4");
  grad.addColorStop(1, "#3B82F6");

  // Rounded rectangle
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(s - r, 0);
  ctx.quadraticCurveTo(s, 0, s, r);
  ctx.lineTo(s, s - r);
  ctx.quadraticCurveTo(s, s, s - r, s);
  ctx.lineTo(r, s);
  ctx.quadraticCurveTo(0, s, 0, s - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Lens ring outer
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = s * 0.03;
  ctx.stroke();

  // Lens ring inner
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.24, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = s * 0.02;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();

  // Checkmark
  const cs = s * 0.22;
  const chkX = cx - cs * 0.6;
  const chkY = cy + cs * 0.1;
  ctx.beginPath();
  ctx.moveTo(chkX, chkY);
  ctx.lineTo(chkX + cs * 0.4, chkY + cs * 0.4);
  ctx.lineTo(chkX + cs * 1.2, chkY - cs * 0.4);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = s * 0.055;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Flash dot
  ctx.beginPath();
  ctx.arc(s * 0.78, s * 0.22, s * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fill();
}

function generate(filename, size, transparent = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!transparent) {
    ctx.fillStyle = "#1152D4";
    ctx.fillRect(0, 0, size, size);
  }
  drawIcon(ctx, size);
  const out = path.resolve(__dirname, "..", "assets", filename);
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log(`✓ ${out} (${size}×${size})`);
}

generate("icon.png", 1024);
generate("adaptive-icon.png", 1024, true);
generate("favicon.png", 48);
generate("splash-icon.png", 512);

console.log("\nDone! Icons generated in assets/");
