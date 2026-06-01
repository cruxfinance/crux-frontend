const fs = require("fs");
const path = require("path");

const ICONS_DIR = path.join(__dirname, "..", "public", "icons", "tokens");
const OUTPUT = path.join(__dirname, "..", "src", "lib", "utils", "icon-manifest.json");

const files = fs.readdirSync(ICONS_DIR);
const manifest = {};

for (const file of files) {
  const dotIndex = file.lastIndexOf(".");
  if (dotIndex === -1) continue;
  const tokenId = file.substring(0, dotIndex);
  const extension = file.substring(dotIndex + 1);
  manifest[tokenId] = extension;
}

fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2));
console.log(`Generated icon manifest with ${Object.keys(manifest).length} entries`);