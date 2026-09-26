const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs/promises');

const root = path.resolve(__dirname, '../src/assets/harbor');
const fish = [
  'fish_neon_guppy', 'fish_binary_bass', 'fish_cyber_koi', 'fish_laser_eel',
  'fish_prism_tetra', 'fish_chrome_manta', 'fish_glitch_trout', 'fish_packet_puffer',
  'fish_firewall_angelfish', 'fish_void_ray', 'fish_mainframe_shark', 'fish_space',
];

async function splitSheet(filename, columns, rows, names, rowEdges) {
  const source = path.join(root, filename);
  const metadata = await sharp(source).metadata();
  if (!metadata.hasAlpha) throw new Error(`${filename} must have a transparent background`);
  const cw = Math.floor(metadata.width / columns);
  const edges = rowEdges || Array.from({ length: rows + 1 }, (_, i) => Math.floor(metadata.height * i / rows));
  for (const [index, name] of names.entries()) {
    const row = Math.floor(index / columns), ch = edges[row + 1] - edges[row];
    const cell = await sharp(source).extract({ left: (index % columns) * cw, top: edges[row], width: cw, height: ch }).ensureAlpha().raw().toBuffer();
    let left = cw, top = ch, right = 0, bottom = 0;
    // Find solid subject bounds, preserving the original alpha inside the crop.
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      if (cell[(y * cw + x) * 4 + 3] > 240) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (left >= right || top >= bottom) throw new Error(`Empty atlas cell: ${name}`);
    if (left < 3 || top < 3 || right > cw - 4 || bottom > ch - 4) throw new Error(`Subject crosses atlas cell: ${name}`);
    await sharp(cell, { raw: { width: cw, height: ch, channels: 4 } })
      .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize({ width: 128, height: 96, fit: 'inside', kernel: 'nearest' }).png()
      .toFile(path.join(root, `${name}.png`));
    console.log(`${name}: ${right - left + 1}x${bottom - top + 1}, alpha preserved`);
  }
}

(async () => {
  await fs.mkdir(root, { recursive: true });
  await sharp(path.join(root, 'harbor-source.png')).webp({ lossless: true }).toFile(path.join(root, 'harbor.webp'));
  await sharp(path.join(root, 'angler-source.png')).extract({ left: 282, top: 107, width: 469, height: 1333 })
    .resize({ height: 192, kernel: 'nearest' }).png().toFile(path.join(root, 'angler.png'));
  await splitSheet('fish-source.png', 4, 3, fish, [0, 330, 650, 1024]);
  if (await fs.stat(path.join(root, 'equipment-source.png')).catch(() => null)) {
    await splitSheet('equipment-source.png', 2, 2, ['backpack', 'boots', 'headgear', 'rod']);
  }
  if (await fs.stat(path.join(root, 'underwater-source.png')).catch(() => null)) {
    await sharp(path.join(root, 'underwater-source.png')).webp({ lossless: true }).toFile(path.join(root, 'underwater.webp'));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
