/**
 * generate-icons.js
 * Run with: node generate-icons.js
 * 
 * Generates PNG icons for the extension using Canvas API (Node.js).
 * Requires: npm install canvas (in extension folder)
 * 
 * OR — if you don't want to install canvas, the extension will still work
 * without icons (Chrome will show a default grey icon).
 * 
 * The manifest references icons/icon16.png, icons/icon48.png, icons/icon128.png
 */

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const iconsDir = path.join(__dirname, "icons");
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#1e3a5f");
  grad.addColorStop(1, "#0f172a");
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, size, size, size * 0.2);
  ctx.fill();

  // Brain icon (simplified)
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.28;
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Inner white dot
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer("image/png");
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

try {
  [16, 48, 128].forEach((size) => {
    const buf = generateIcon(size);
    fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
    console.log(`✅ Generated icon${size}.png`);
  });
  console.log("Icons generated successfully in ./icons/");
} catch (e) {
  console.warn("⚠️  canvas module not found. Using placeholder icons.");
  console.warn("   Install with: npm install canvas");
  console.warn("   Or add your own PNG files to the icons/ folder.");
  // Create empty placeholder files so Chrome doesn't error
  [16, 48, 128].forEach((size) => {
    const p = path.join(iconsDir, `icon${size}.png`);
    if (!fs.existsSync(p)) fs.writeFileSync(p, Buffer.alloc(0));
  });
}
