import test from 'node:test';
import assert from 'node:assert/strict';
import { CAST_RELEASE_PROGRESS, getSceneLayout, getCastAngle, getCastBobber, getRodPose } from '../src/utils/sceneLayout.ts';

const screens = [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900], [2560, 1440]];
for (const [width, height] of screens) {
  test(`actor, deck, line and casting arc remain in bounds at ${width}x${height}`, () => {
    const layout = getSceneLayout(width, height);
    const { character, hand, feet, dockY, pierEnd, target, scale } = layout;
    assert.ok(Math.abs(character.y + character.height - dockY) < 1e-8, 'Feet must touch the deck');
    assert.ok(character.x >= 0 && character.x + character.width < pierEnd, 'Actor stays on pier');
    assert.equal(feet.y, dockY);
    assert.ok(hand.x > character.x && hand.x < character.x + character.width, 'Hand is inside the actual trimmed sprite');
    assert.ok(target.x > pierEnd && target.x < width, 'Cast lands in open water');
    assert.ok(target.y > layout.waterY && target.y < height - 130, 'Bobber stays clear of controls');
    let lastAngle = getCastAngle(0);
    const beforeRelease = getCastBobber(CAST_RELEASE_PROGRESS - 1e-8, hand, target, scale);
    const afterRelease = getCastBobber(CAST_RELEASE_PROGRESS, hand, target, scale);
    assert.ok(Math.hypot(beforeRelease.x - afterRelease.x, beforeRelease.y - afterRelease.y) < 0.001, 'Bobber cannot jump when released');
    const landing = getCastBobber(1, hand, target, scale);
    assert.ok(Math.hypot(landing.x - target.x, landing.y - target.y) < 0.001, 'Cast ends at the waiting anchor');
    for (let i = 0; i <= 100; i++) {
      const angle = getCastAngle(i / 100);
      const tip = getRodPose(angle, hand, scale);
      assert.ok(tip.x > 0 && tip.x < width && tip.y > 58 && tip.y < height - 80, 'Rod cannot clip through a screen edge');
      assert.ok(Math.abs(angle - lastAngle) < 0.17, 'No discontinuities between cast phases');
      lastAngle = angle;
    }
  });
}
