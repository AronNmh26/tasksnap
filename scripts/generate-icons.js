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
  const r = s * 0.2;
  const cx = s / 2;
  const cy = s / 2;

  // Rich blue body gradient.
  const grad = ctx.createLinearGradient(s * 0.1, 0, s * 0.9, s);
  grad.addColorStop(0, "#1B57E1");
  grad.addColorStop(0.55, "#0A3FC0");
  grad.addColorStop(1, "#0F3394");

  // Rounded app tile.
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

  // Gloss highlight for modern look.
  const gloss = ctx.createLinearGradient(0, 0, 0, s * 0.42);
  gloss.addColorStop(0, "rgba(255,255,255,0.34)");
  gloss.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.beginPath();
  ctx.moveTo(r * 1.05, r * 0.9);
  ctx.lineTo(s - r * 1.05, r * 0.9);
  ctx.quadraticCurveTo(s - r * 0.4, r * 0.95, s - r * 0.45, r * 1.5);
  ctx.lineTo(r * 0.45, r * 1.5);
  ctx.quadraticCurveTo(r * 0.4, r * 0.95, r * 1.05, r * 0.9);
  ctx.closePath();
  ctx.fillStyle = gloss;
  ctx.fill();

  // Outer ring.
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.33, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(119,173,255,0.55)";
  ctx.lineWidth = s * 0.022;
  ctx.stroke();

  // Middle ring.
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.255, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(95,156,255,0.42)";
  ctx.lineWidth = s * 0.016;
  ctx.stroke();

  // Inner disc.
  const discGrad = ctx.createRadialGradient(cx, cy - s * 0.04, s * 0.04, cx, cy, s * 0.24);
  discGrad.addColorStop(0, "rgba(77,134,236,0.88)");
  discGrad.addColorStop(1, "rgba(44,94,199,0.84)");
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.23, 0, Math.PI * 2);
  ctx.fillStyle = discGrad;
  ctx.fill();

  // Inner rim glow.
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.23, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = s * 0.012;
  ctx.stroke();

  // Checkmark with subtle shadow.
  const cs = s * 0.24;
  const chkX = cx - cs * 0.62;
  const chkY = cy + cs * 0.12;

  ctx.beginPath();
  ctx.moveTo(chkX + s * 0.005, chkY + s * 0.007);
  ctx.lineTo(chkX + cs * 0.42 + s * 0.005, chkY + cs * 0.38 + s * 0.007);
  ctx.lineTo(chkX + cs * 1.2 + s * 0.005, chkY - cs * 0.42 + s * 0.007);
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = s * 0.06;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(chkX, chkY);
  ctx.lineTo(chkX + cs * 0.42, chkY + cs * 0.38);
  ctx.lineTo(chkX + cs * 1.2, chkY - cs * 0.42);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = s * 0.058;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  // Accent dot.
  ctx.beginPath();
  ctx.arc(s * 0.74, s * 0.31, s * 0.028, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
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
