// Generuje všetky veľkosti launcher ikon pre Android z kalkulačkového SVG zdroja
const fs = require("fs");
const path = require("path");
const os = require("os");

// sharp je nainštalovaný v temp priečinku (z predchádzajúceho kroku)
const sharpDir = path.join(
  os.tmpdir().replace(/\\/g, "/"),
  "img_resize_1785667231268",
  "node_modules",
  "sharp"
);
let sharp;
try {
  sharp = require(sharpDir);
} catch (e) {
  sharp = require("sharp"); // fallback
}

// ===== Kalkulačková ikona (z používateľského SVG) =====
// Vyrobené ako štvorec 512, adaptívny foreground rovnaký dizajn.
function iconSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <style>
      .bg { fill: #383838; }
      .display-bg { fill: #EBEBEB; }
      .btn-grey { fill: #7E7E7E; }
      .btn-blue { fill: #0052CC; }
      .text-dark { fill: #262626; font-family: system-ui, -apple-system, sans-serif; font-weight: 700; }
      .text-white { fill: #FFFFFF; font-family: system-ui, -apple-system, sans-serif; font-weight: 600; }
    </style>
  </defs>
  <rect class="bg" x="0" y="0" width="512" height="512" rx="110" />
  <rect class="display-bg" x="72" y="70" width="368" height="100" rx="32" />
  <text x="410" y="142" class="text-dark" font-size="82" text-anchor="end" letter-spacing="-2">100</text>
  <rect class="btn-grey" x="72" y="200" width="106" height="106" rx="30" />
  <text x="125" y="278" class="text-white" font-size="64" text-anchor="middle">$</text>
  <rect class="btn-grey" x="203" y="200" width="106" height="106" rx="30" />
  <text x="256" y="277" class="text-white" font-size="62" text-anchor="middle">€</text>
  <rect class="btn-blue" x="334" y="200" width="106" height="106" rx="30" />
  <path d="M374 253 h26 m-13 -13 v26" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" />
  <rect class="btn-grey" x="72" y="331" width="106" height="106" rx="30" />
  <text x="125" y="407" class="text-white" font-size="62" text-anchor="middle">¥</text>
  <rect class="btn-grey" x="203" y="331" width="106" height="106" rx="30" />
  <text x="256" y="407" class="text-white" font-size="62" text-anchor="middle">₽</text>
  <rect class="btn-blue" x="334" y="331" width="106" height="106" rx="30" />
  <path d="M372 376 h30 M372 392 h30" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" />
</svg>`;
}

// Adaptívny foreground = dizajn zmenšený do vnútornej safe-zone (~72%),
// aby ho adaptívna ikona (ktorá ořeže okraje) nezrezala a pekne vyplnil priestor.
function foregroundSVG(size) {
  // Obsah vykreslíme v 512 viewBoxe, ale zoskálovaný dovnútra cez transform.
  // Safe zone je ~66% z 512 = ~338. Pôvodný obsah je ~368 široký, zmenšíme ho na ~300 a vycentrujeme.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <style>
      .bg { fill: #383838; }
      .display-bg { fill: #EBEBEB; }
      .btn-grey { fill: #7E7E7E; }
      .btn-blue { fill: #0052CC; }
      .text-dark { fill: #262626; font-family: system-ui, -apple-system, sans-serif; font-weight: 700; }
      .text-white { fill: #FFFFFF; font-family: system-ui, -apple-system, sans-serif; font-weight: 600; }
    </style>
  </defs>
  <!-- pozadie vyplní celú adaptívnu ikonu -->
  <rect class="bg" x="0" y="0" width="512" height="512" />
  <!-- obsah zmenšený a vycentrovaný: scale ~0.78, posun do stredu -->
  <g transform="translate(256 256) scale(0.78) translate(-256 -256)">
    <rect class="display-bg" x="72" y="70" width="368" height="100" rx="32" />
    <text x="410" y="142" class="text-dark" font-size="82" text-anchor="end" letter-spacing="-2">100</text>
    <rect class="btn-grey" x="72" y="200" width="106" height="106" rx="30" />
    <text x="125" y="278" class="text-white" font-size="64" text-anchor="middle">$</text>
    <rect class="btn-grey" x="203" y="200" width="106" height="106" rx="30" />
    <text x="256" y="277" class="text-white" font-size="62" text-anchor="middle">€</text>
    <rect class="btn-blue" x="334" y="200" width="106" height="106" rx="30" />
    <path d="M374 253 h26 m-13 -13 v26" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" />
    <rect class="btn-grey" x="72" y="331" width="106" height="106" rx="30" />
    <text x="125" y="407" class="text-white" font-size="62" text-anchor="middle">¥</text>
    <rect class="btn-grey" x="203" y="331" width="106" height="106" rx="30" />
    <text x="256" y="407" class="text-white" font-size="62" text-anchor="middle">₽</text>
    <rect class="btn-blue" x="334" y="331" width="106" height="106" rx="30" />
    <path d="M372 376 h30 M372 392 h30" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" />
  </g>
</svg>`;
}

const ROOT = path.join(__dirname, "android", "app", "src", "main", "res");

// mipmap veľkosti (ic_launcher)
const mipmapDirs = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};
// adaptive foreground veľkosti (108dp)
const adaptiveDirs = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};

async function generate() {
  for (const [dir, size] of Object.entries(mipmapDirs)) {
    const outDir = path.join(ROOT, dir);
    fs.mkdirSync(outDir, { recursive: true });
    const buf = await sharp(Buffer.from(iconSVG(size))).resize(size, size).png().toBuffer();
    fs.writeFileSync(path.join(outDir, "ic_launcher.png"), buf);
    fs.writeFileSync(path.join(outDir, "ic_launcher_round.png"), buf);
    console.log("icon", dir, size, "OK");
  }
  for (const [dir, size] of Object.entries(adaptiveDirs)) {
    const outDir = path.join(ROOT, dir);
    fs.mkdirSync(outDir, { recursive: true });
    const buf = await sharp(Buffer.from(foregroundSVG(size))).resize(size, size).png().toBuffer();
    fs.writeFileSync(path.join(outDir, "ic_launcher_foreground.png"), buf);
    console.log("foreground", dir, size, "OK");
  }
  console.log("Všetky ikony vygenerované.");
}

generate().catch((e) => {
  console.error("Chyba:", e);
  process.exit(1);
});
