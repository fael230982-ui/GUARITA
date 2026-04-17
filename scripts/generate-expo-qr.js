const fs = require("fs");
const QRCode = require("../node_modules/qrcode-terminal/vendor/QRCode");
const QRErrorCorrectLevel = require("../node_modules/qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel");

const data = process.argv[2];
const output = process.argv[3] ?? "expo-go-qr.svg";

if (!data) {
  throw new Error("Usage: node scripts/generate-expo-qr.js <expo-url> [output.svg]");
}

const qr = new QRCode(-1, QRErrorCorrectLevel.M);
qr.addData(data);
qr.make();

const count = qr.getModuleCount();
const cell = 10;
const margin = 4;
const size = (count + margin * 2) * cell;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
svg += '<rect width="100%" height="100%" fill="#fff"/>';

for (let row = 0; row < count; row += 1) {
  for (let col = 0; col < count; col += 1) {
    if (qr.isDark(row, col)) {
      svg += `<rect x="${(col + margin) * cell}" y="${(row + margin) * cell}" width="${cell}" height="${cell}" fill="#000"/>`;
    }
  }
}

svg += "</svg>";
fs.writeFileSync(output, svg);
console.log(data);
