import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { ANGLER_ATLAS, CAST_ANIMATION_MS, LANDING_ANIMATION_SECONDS, getAnglerGeometry, getLandingPosition, recoveryProgress, sampleAnglerMotion } from '../src/utils/anglerAnimation.ts';
import { CAST_RELEASE_PROGRESS, getCastBobber, getRodPose, getSceneLayout } from '../src/utils/sceneLayout.ts';

test('all twelve sprites have real alpha, solid grip anchors and a common deck baseline', async () => {
  const { data, info } = await sharp('src/assets/harbor/angler-actions.png').raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  assert.equal(ANGLER_ATLAS.frames.length, 12);
  const alpha = (x, y) => data[(Math.round(y) * info.width + Math.round(x)) * 4 + 3];
  for (const frame of ANGLER_ATLAS.frames) {
    assert.equal(alpha(frame.x, frame.y), 0, `${frame.name}: gutters are transparent`);
    for (const key of ['hand', 'freeHand']) {
      assert.ok(alpha(frame.x + frame[key].x, frame.y + frame[key].y) > 200, `${frame.name}: ${key} attaches to actual sprite pixels`);
    }
    let soles = 0;
    for (let x = 0; x < ANGLER_ATLAS.frameWidth; x++) soles += alpha(frame.x + x, frame.y + ANGLER_ATLAS.foot.y - 1) > 100;
    assert.ok(soles > 0, `${frame.name}: boots touch the baseline`);
    assert.equal(frame.bounds.y + frame.bounds.height, ANGLER_ATLAS.foot.y);
  }
});

for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900], [2560, 1440]]) {
  test(`full-body poses, rod and fish stay aligned at ${width}x${height}`, () => {
    const { feet, scale, dockY, target } = getSceneLayout(width, height);
    for (const state of ['IDLE', 'CASTING', 'WAITING', 'MINIGAME', 'CAUGHT']) {
      for (let i = 0; i < 200; i++) {
        const age = i / 100, motion = sampleAnglerMotion(state, age, age);
        const actor = getAnglerGeometry(motion, feet, scale);
        assert.ok(Math.abs(actor.y + ANGLER_ATLAS.foot.y * scale * motion.stretch - dockY) < 1e-8, 'Animation never moves the deck anchor');
        const bounds = actor.frame.bounds;
        assert.ok(actor.x + bounds.x * scale >= 0 && actor.x + (bounds.x + bounds.width) * scale <= width, `${state} ${age}: complete body in screen`);
        const tip = getRodPose(motion.angle, actor.hand, scale);
        assert.ok(tip.x > 0 && tip.x < width && tip.y > 58 && tip.y < height - 80, `${state} ${age}: rod stays in screen`);
      }
    }
    const release = getAnglerGeometry(sampleAnglerMotion('CASTING', CAST_RELEASE_PROGRESS * CAST_ANIMATION_MS / 1000, 0), feet, scale).hand;
    const before = getCastBobber(CAST_RELEASE_PROGRESS - 1e-8, release, target, scale, release);
    const after = getCastBobber(CAST_RELEASE_PROGRESS, release, target, scale, release);
    assert.ok(Math.hypot(before.x - after.x, before.y - after.y) < 0.001);
    const forward = getCastBobber(0.8, { x: 0, y: 0 }, target, scale, release);
    const other = getCastBobber(0.8, { x: 100, y: 100 }, target, scale, release);
    assert.deepEqual(forward, other, 'Follow-through cannot drag the airborne float around');
    assert.deepEqual(getLandingPosition(0, target, feet, scale), target, 'Landing starts at water');
    const palm = getAnglerGeometry(sampleAnglerMotion('CAUGHT', LANDING_ANIMATION_SECONDS, 0), feet, scale).freeHand;
    const caught = getLandingPosition(LANDING_ANIMATION_SECONDS, target, palm, scale);
    assert.ok(Math.abs(caught.x - palm.x) < 1e-8 && Math.abs(caught.y - palm.y + 7 * scale) < 1e-8, 'Catch lands above the open palm');
  });
}

test('animation phases cover casting, reeling and a visible landing before completion', () => {
  const frames = new Set();
  for (let age = 0; age <= CAST_ANIMATION_MS / 1000; age += 0.01) frames.add(sampleAnglerMotion('CASTING', age, 0).frame);
  assert.deepEqual([...frames], [0, 2, 3, 4, 5, 6]);
  assert.equal(sampleAnglerMotion('MINIGAME', 0, 0).frame, 7);
  assert.equal(sampleAnglerMotion('MINIGAME', 0.3, 0).frame, 8);
  assert.equal(sampleAnglerMotion('MINIGAME', 0.6, 0).frame, 9);
  assert.equal(sampleAnglerMotion('CAUGHT', 0.2, 0).frame, 10);
  assert.equal(sampleAnglerMotion('CAUGHT', LANDING_ANIMATION_SECONDS, 0).frame, 11);
  assert.equal(recoveryProgress(0), 0);
  assert.equal(recoveryProgress(1), 1);
});
