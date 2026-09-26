import { chromium } from 'playwright';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const output = path.resolve('test-results/harbor');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'msedge' });
const report = { screens: [], consoleErrors: [], assetFailures: [], gameplay: [] };
async function pageFor(width, height, level = 1, lang = 'zh', seed = 42) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.addInitScript(({ level, lang, seed }) => {
    localStorage.setItem('bytefisher_lang', lang);
    localStorage.setItem('bytefisher_mute', '1');
    localStorage.setItem('bytefisher_difficulty', 'simple');
    localStorage.setItem('bytefisher_upgrades', JSON.stringify({ barSize: level, stability: level, luck: level, netStrength: level }));
    localStorage.setItem('bytefisher_stats', JSON.stringify({ credits: 99999, inventory: [], caughtCount: 0, unlockedItems: [], catchStats: {}, completedContracts: [] }));
    let state = seed;
    Math.random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  }, { level, lang, seed });
  page.on('pageerror', e => report.consoleErrors.push(e.message));
  page.on('console', message => { if (message.type() === 'error' && message.location().url.startsWith(baseURL)) report.consoleErrors.push(`${message.location().url}: ${message.text()}`); });
  page.on('response', r => { if (r.url().startsWith(baseURL) && r.status() >= 400) report.assetFailures.push(`${r.status()} ${r.url()}`); });
  await page.goto(baseURL);
  await page.waitForFunction(() => document.querySelector('[data-testid="cast-button"]'));
  await page.waitForTimeout(650);
  return page;
}
async function checkUI(page, name) {
  const issues = await page.evaluate(() => {
    const errors = [];
    if (document.documentElement.scrollWidth > innerWidth) errors.push('Document overflows horizontally');
    for (const el of document.querySelectorAll('button, select, h1, h2')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // Offscreen items inside intentional scroll regions are allowed.
      const clippedByScroller = [...function* () { let n = el.parentElement; while (n) { yield n; n = n.parentElement; } }()].some(n => ['auto', 'scroll'].includes(getComputedStyle(n).overflowY));
      if (r.left < -1 || r.right > innerWidth + 1) errors.push(`Horizontal clipping: ${el.textContent}`);
      if (!clippedByScroller && (r.top < -1 || r.bottom > innerHeight + 1)) errors.push(`Vertical clipping: ${el.textContent}`);
      if (el.scrollWidth > el.clientWidth + 2) errors.push(`Text does not fit: ${el.textContent}`);
    }
    for (const img of document.images) if (!img.complete || !img.naturalWidth) errors.push(`Unloaded image: ${img.src}`);
    return errors;
  });
  assert.deepEqual(issues, [], `${name}: ${issues.join('; ')}`);
  await page.screenshot({ path: path.join(output, `${name}.png`) });
}
try {
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900], [2560, 1440]]) {
    const name = `${width}x${height}`;
    const page = await pageFor(width, height, width === 768 || width === 2560 ? 5 : 1);
    await checkUI(page, `${name}-idle`);
    const pixels = await page.locator('canvas').screenshot();
    const stats = await sharp(pixels).stats();
    assert.ok(stats.channels[0].stdev > 10, `${name}: canvas must not be blank`);
    const first = await page.locator('canvas').screenshot();
    await page.waitForTimeout(200);
    assert.notEqual(Buffer.compare(first, await page.locator('canvas').screenshot()), 0, 'Scene must animate');
    for (const menu of ['shop', 'codex', 'guidebook', 'terminal']) {
      await page.getByTestId(`nav-${menu}`).click();
      await page.waitForTimeout(150);
      await checkUI(page, `${name}-${menu}`);
      if (menu === 'terminal') {
        await page.getByRole('button', { name: '消息缓冲区', exact: true }).click();
        await page.waitForTimeout(160);
        await checkUI(page, `${name}-composer`);
        await page.getByRole('button', { name: '留言板', exact: true }).click();
        await page.waitForTimeout(160);
        await checkUI(page, `${name}-message-board`);
      }
      await page.getByTestId('close-dialog').click();
    }
    await page.getByTestId('cast-button').click();
    await page.waitForTimeout(500);
    await checkUI(page, `${name}-cast`);
    await page.getByTestId('minigame').waitFor({ timeout: 10000 });
    await checkUI(page, `${name}-minigame`);
    const fish = await page.getByTestId('minigame-fish').boundingBox();
    const track = await page.getByTestId('fish-track').boundingBox();
    assert.ok(fish.y >= track.y && fish.y + fish.height <= track.y + track.height, 'Fish stays in track');
    await page.close();
    report.screens.push({ width, height, menus: 4, canvasAnimated: true, passed: true });
    console.log(`PASS ${name}: scene, menus, casting, minigame`);
  }
  // Follow the fish using the same input a player has, then exercise failure and cancellation.
  for (const level of [1, 5]) {
    const page = await pageFor(1440, 900, level, 'en', 77 + level);
    await page.getByTestId('cast-button').click();
    await page.getByTestId('minigame').waitFor({ timeout: 10000 });
    let held = false, top = Infinity, bottom = -Infinity, previousPosition = null;
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline && await page.getByTestId('minigame').count()) {
      const pos = await page.evaluate(() => {
        const fish = document.querySelector('[data-testid="minigame-fish"]');
        const bar = document.querySelector('[data-testid="catch-zone"]');
        return fish && bar ? { fish: parseFloat(fish.style.bottom), bar: parseFloat(bar.style.bottom), size: parseFloat(bar.style.height), time: performance.now() } : null;
      });
      if (!pos) break;
      top = Math.min(top, pos.fish); bottom = Math.max(bottom, pos.fish);
      const velocity = previousPosition ? (pos.bar - previousPosition.bar) / Math.max(0.001, (pos.time - previousPosition.time) / 1000) : 0;
      const press = pos.bar + pos.size * 0.5 + velocity * 0.1 < pos.fish;
      previousPosition = pos;
      if (press !== held) { if (press) await page.keyboard.down('Space'); else await page.keyboard.up('Space'); held = press; }
      await page.waitForTimeout(25);
    }
    await page.keyboard.up('Space');
    const caught = await page.evaluate(() => JSON.parse(localStorage.getItem('bytefisher_stats')).caughtCount);
    assert.ok(caught > 0, `Level ${level}: auto-follow must land a fish`);
    assert.ok(bottom - top > 2, `Level ${level}: fish must not stick to an edge`);
    assert.equal(await page.getByTestId('catch-result').count(), 0, 'Result must not hide the landing animation');
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.actorPose === 'lift');
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(output, `landing-level-${level}.png`) });
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.actorPose === 'present');
    assert.equal(await page.getByTestId('catch-result').count(), 0, 'Presentation pose is visible before result');
    await page.screenshot({ path: path.join(output, `presentation-level-${level}.png`) });
    await page.getByTestId('catch-result').waitFor({ timeout: 3000 });
    await page.screenshot({ path: path.join(output, `caught-level-${level}.png`) });
    await page.getByTestId('catch-result').getByRole('button').click();
    await page.waitForTimeout(450);
    assert.ok(['idle', 'breathe'].includes(await page.locator('canvas').getAttribute('data-actor-pose')), 'Claiming returns to idle');
    await page.getByTestId('cast-button').click();
    assert.equal(await page.getByTestId('catch-result').count(), 0, 'Previous landing cannot reopen the result');
    report.gameplay.push({ level, caught, fishTravel: bottom - top, landingVisible: true, returnToIdle: true });
    await page.close();
  }
  const failPage = await pageFor(390, 844);
  await failPage.getByTestId('cast-button').click();
  await failPage.getByRole('button', { name: '收竿', exact: true }).click();
  await failPage.waitForTimeout(1200);
  assert.equal(await failPage.getByTestId('cast-button').count(), 1, 'Cancelled cast cannot restart');
  // A mid-water target cannot drift into the resting bar, making the no-input loss deterministic.
  await failPage.evaluate(() => { Math.random = () => 0.5; });
  await failPage.getByTestId('cast-button').click();
  await failPage.getByTestId('minigame').waitFor({ timeout: 10000 });
  await failPage.getByTestId('cast-button').waitFor({ timeout: 12000 });
  assert.equal(await failPage.evaluate(() => JSON.parse(localStorage.getItem('bytefisher_stats')).caughtCount), 0);
  report.gameplay.push({ cancellation: true, noInputFailure: true });
  await failPage.close();
  const resizePage = await pageFor(390, 844, 5);
  await resizePage.getByTestId('cast-button').click();
  await resizePage.getByTestId('minigame').waitFor({ timeout: 10000 });
  await resizePage.keyboard.down('Space');
  await resizePage.waitForTimeout(150);
  await resizePage.keyboard.up('Space');
  await resizePage.setViewportSize({ width: 844, height: 390 });
  await checkUI(resizePage, 'resized-during-minigame');
  await resizePage.close();
  const retina = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await retina.goto(baseURL);
  await retina.waitForTimeout(700);
  assert.equal(await retina.locator('canvas').evaluate(c => c.width), 780, 'Canvas honors pixel density');
  await retina.screenshot({ path: path.join(output, 'retina-mobile.png') });
  await retina.close();
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.assetFailures, []);
} finally {
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
