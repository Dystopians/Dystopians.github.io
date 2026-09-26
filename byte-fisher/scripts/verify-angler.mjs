import { chromium } from 'playwright';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getSceneLayout } from '../src/utils/sceneLayout.ts';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const output = path.resolve('test-results/angler');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], results = [];
try {
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('bytefisher_mute', '1');
      Math.random = () => 0.5;
    });
    await page.goto(baseURL);
    await page.waitForTimeout(800);
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 100));
    await page.getByTestId('cast-button').click();
    let time = 0;
    const panels = [], bodyPixels = new Set();
    const layout = getSceneLayout(width, height), s = layout.scale;
    for (const [at, pose] of [[70, 'idle'], [220, 'anticipate'], [365, 'backswing'], [550, 'release'], [800, 'follow'], [1040, 'wait'], [5650, 'strike'], [5900, 'reelLow'], [6150, 'reelHigh']]) {
      await page.clock.runFor(at - time); time = at;
      assert.equal(await page.locator('canvas').getAttribute('data-actor-pose'), pose, `${width}x${height} @${at}`);
      const screenshot = await page.screenshot({ path: path.join(output, `${width}x${height}-${pose}.png`) });
      const crop = { left: Math.max(0, Math.floor(layout.feet.x - 120 * s)), top: Math.max(0, Math.floor(layout.feet.y - 260 * s)), width: Math.min(width, Math.floor(320 * s)), height: Math.floor(280 * s) };
      crop.width = Math.min(crop.width, width - crop.left);
      crop.height = Math.min(crop.height, height - crop.top);
      const panel = await sharp(screenshot).extract(crop).resize(320, 280, { fit: 'contain', background: '#081b23', kernel: 'nearest' }).png().toBuffer();
      const label = Buffer.from(`<svg width="320" height="30"><rect width="320" height="30" fill="#081b23"/><text x="12" y="20" fill="#d5e9e3" font-family="sans-serif" font-size="14">${pose}</text></svg>`);
      const cell = panels.length / 2;
      panels.push({ input: panel, left: cell % 3 * 320, top: Math.floor(cell / 3) * 310 });
      panels.push({ input: label, left: cell % 3 * 320, top: Math.floor(cell / 3) * 310 + 280 });
      const body = await sharp(screenshot).extract({ left: Math.floor(layout.feet.x - 40 * s), top: Math.floor(layout.feet.y - 140 * s), width: Math.floor(100 * s), height: Math.floor(130 * s) }).raw().toBuffer();
      bodyPixels.add(body.toString('base64'));
    }
    await sharp({ create: { width: 960, height: 930, channels: 4, background: '#081b23' } }).composite(panels).png().toFile(path.join(output, `${width}x${height}-actions.png`));
    assert.equal(bodyPixels.size, 9, 'Actual character pixels must change, not just the rod');
    await page.clock.runFor(12000);
    assert.ok(['idle', 'breathe'].includes(await page.locator('canvas').getAttribute('data-actor-pose')), 'Failure restores idle');
    await page.getByTestId('cast-button').click();
    await page.clock.runFor(370);
    await page.getByRole('button', { name: '收竿', exact: true }).click();
    await page.clock.runFor(450);
    assert.ok(['idle', 'breathe'].includes(await page.locator('canvas').getAttribute('data-actor-pose')), 'Cancel restores idle');
    await page.getByTestId('cast-button').click();
    await page.clock.runFor(200);
    await page.getByRole('button', { name: '收竿', exact: true }).click();
    await page.getByTestId('cast-button').click();
    await page.clock.runFor(1200);
    assert.equal(await page.locator('canvas').getAttribute('data-scene-state'), 'WAITING', 'A quick recast interrupts recovery cleanly');
    results.push({ width, height, poses: 9, bodyPixelsChanged: true, failureRecovery: true, cancellationRecovery: true, quickRecast: true });
    await page.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
console.log(JSON.stringify(results));
