// Run with Node.js and sharp installed: node scripts/generate-brand-assets.cjs
// SVG files are the editable masters. This only regenerates their raster exports.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const images = path.resolve(__dirname, '../images');

function ico(pngs, sizes) {
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach((png, i) => {
    const entry = 6 + i * 16;
    header[entry] = header[entry + 1] = sizes[i] === 256 ? 0 : sizes[i];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs]);
}

async function main() {
  const master = await fs.readFile(path.join(images, 'logo-peilin.svg'), 'utf8');
  const micro = await fs.readFile(path.join(images, 'favicon.svg'), 'utf8');
  const render = (svg, size) => sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size).png().toBuffer();
  const exports = [
    ['logo-peilin.png', 256], ['favicon.png', 256],
    ['favicon-16x16.png', 16], ['favicon-32x32.png', 32],
    ['favicon-48_.png', 48], ['favicon-192x192.png', 192],
    ['favicon-512x512.png', 512], ['favicon-1024.png', 1024],
    ['apple-touch-icon-180x180.png', 180],
  ];
  for (const [name, size] of exports) {
    // Apple applies its own corner mask; provide an opaque edge-to-edge tile.
    const svg = name.startsWith('apple-') ? master.replace('rx="18"', 'rx="0"') : size <= 32 ? micro : master;
    await fs.writeFile(path.join(images, name), await render(svg, size));
  }
  // Keep every foreground point inside the central 80%-diameter safe circle.
  const maskable = master.replace('rx="18"', 'rx="0"')
    .replace('<g fill=', '<g transform="translate(6.4 6.4) scale(.8)" fill=');
  await fs.writeFile(path.join(images, 'favicon-maskable-512x512.png'), await render(maskable, 512));
  const sizes = [16, 32, 48, 256];
  const pngs = await Promise.all(sizes.map(size => render(size <= 32 ? micro : master, size)));
  const icon = ico(pngs, sizes);
  await Promise.all(['favicon.ico', 'favicon_.ico'].map(name => fs.writeFile(path.join(images, name), icon)));
  console.log(`Generated ${exports.length} PNG exports, one maskable icon and two ICO containers.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
