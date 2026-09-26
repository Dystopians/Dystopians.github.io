const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');

const directory = path.resolve('src/assets/harbor');
const frameWidth = 160, frameHeight = 176, foot = { x: 64, y: 168 };
const scale = 140 / 382;
// Inspected source coordinates, not equal-cell guesses: the forward cast crosses a grid gutter.
const poses = [
  { name: 'idle', box: [97, 25, 266, 406], feetX: 182, hand: [255, 196], freeHand: [214, 205] },
  { name: 'breathe', box: [409, 26, 579, 406], feetX: 494, hand: [567, 194], freeHand: [529, 203] },
  { name: 'anticipate', box: [705, 57, 881, 407], feetX: 793, hand: [827, 165], freeHand: [809, 152] },
  { name: 'backswing', box: [1002, 27, 1191, 407], feetX: 1097, hand: [1035, 56], freeHand: [1025, 79] },
  { name: 'release', box: [58, 451, 354, 812], feetX: 170, hand: [338, 548], freeHand: [324, 550] },
  { name: 'follow', box: [387, 461, 619, 812], feetX: 483, hand: [600, 638], freeHand: [609, 631] },
  { name: 'wait', box: [713, 438, 885, 817], feetX: 797, hand: [872, 608], freeHand: [825, 614] },
  { name: 'strike', box: [1013, 454, 1195, 813], feetX: 1104, hand: [1145, 562], freeHand: [1121, 548] },
  { name: 'reelLow', box: [87, 857, 269, 1235], feetX: 180, hand: [231, 978], freeHand: [208, 1016] },
  { name: 'reelHigh', box: [401, 858, 582, 1234], feetX: 494, hand: [516, 958], freeHand: [525, 1009] },
  { name: 'lift', box: [710, 849, 910, 1236], feetX: 797, hand: [841, 914], freeHand: [893, 989] },
  { name: 'present', box: [1038, 852, 1226, 1235], feetX: 1115, hand: [1166, 930], freeHand: [1208, 1014] },
];

async function main() {
  const source = path.join(directory, 'angler-actions-source.png');
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 1254 || metadata.height !== 1254 || !metadata.hasAlpha) throw new Error('Unexpected source dimensions or missing alpha');
  const layers = [], frames = [];
  for (const [index, pose] of poses.entries()) {
    const [x, y, right, bottom] = pose.box;
    const crop = { left: x - 2, top: y - 2, width: right - x + 5, height: bottom - y + 3 };
    const width = Math.round(crop.width * scale), height = Math.round(crop.height * scale);
    const sx = width / crop.width, sy = height / crop.height;
    const left = Math.round(foot.x + (crop.left - pose.feetX) * sx), top = foot.y - height;
    if (left < 0 || top < 0 || left + width > frameWidth) throw new Error(`Frame ${pose.name} clips its cell`);
    const input = await sharp(source).extract(crop).resize(width, height, { kernel: 'nearest' }).png().toBuffer();
    layers.push({ input, left: index % 4 * frameWidth + left, top: Math.floor(index / 4) * frameHeight + top });
    const point = ([px, py]) => ({ x: left + (px - crop.left) * sx, y: top + (py - crop.top) * sy });
    frames.push({ name: pose.name, x: index % 4 * frameWidth, y: Math.floor(index / 4) * frameHeight, hand: point(pose.hand), freeHand: point(pose.freeHand), bounds: { x: left, y: top, width, height } });
  }
  await sharp({ create: { width: frameWidth * 4, height: frameHeight * 3, channels: 4, background: '#00000000' } }).composite(layers).png().toFile(path.join(directory, 'angler-actions.png'));
  await fs.writeFile(path.join(directory, 'angler-actions.json'), JSON.stringify({ frameWidth, frameHeight, foot, frames }, null, 2) + '\n');
  console.log(`Packed ${frames.length} calibrated character poses with transparent alpha.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
