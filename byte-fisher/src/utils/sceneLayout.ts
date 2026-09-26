export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const CAST_RELEASE_PROGRESS = 0.5;

export function getSceneLayout(width: number, height: number) {
  const compact = width < 640;
  const scale = Math.min(clamp(width / 850, 0.65, 1.35), clamp(height / 740, 0.48, 1.35));
  const waterY = Math.round(height * (height < 500 ? 0.62 : 0.59));
  const dockY = waterY - 20 * scale;
  const pierEnd = width * (compact ? 0.43 : 0.39);
  const feet = { x: pierEnd - 45 * scale, y: dockY };
  const characterHeight = 140 * scale;
  const characterWidth = characterHeight * (68 / 192);
  const character = { x: feet.x - characterWidth / 2, y: feet.y - characterHeight, width: characterWidth, height: characterHeight };
  return {
    width, height, compact, scale, waterY, dockY, pierEnd, feet, character,
    hand: { x: character.x + character.width * 0.91, y: character.y + character.height * 0.408 },
    target: { x: Math.min(width - 40 * scale, pierEnd + 170 * scale), y: waterY + 24 * scale },
    fishTop: waterY + 65 * scale,
    fishBottom: Math.max(waterY + 65 * scale, height - 130),
  };
}

export function getRodPose(angle: number, hand: { x: number; y: number }, scale: number) {
  const length = 113 * scale;
  return { x: hand.x + Math.cos(angle) * length, y: hand.y + Math.sin(angle) * length };
}

export function getCastAngle(progress: number) {
  const p = clamp(progress, 0, 1);
  const smooth = (v: number) => v * v * (3 - 2 * v);
  if (p < 0.32) return -0.72 - 1.53 * smooth(p / 0.32);
  if (p < CAST_RELEASE_PROGRESS) return -2.25 + 1.93 * smooth((p - 0.32) / 0.18);
  return -0.32 - 0.17 * smooth((p - CAST_RELEASE_PROGRESS) / (1 - CAST_RELEASE_PROGRESS));
}

export function getCastBobber(progress: number, hand: { x: number; y: number }, target: { x: number; y: number }, scale: number, releaseHand = hand) {
  const p = clamp(progress, 0, 1);
  if (p < CAST_RELEASE_PROGRESS) {
    const tip = getRodPose(getCastAngle(p), hand, scale);
    return { x: tip.x + 5 * scale * (1 - p / CAST_RELEASE_PROGRESS), y: tip.y + (30 - 15 * p / CAST_RELEASE_PROGRESS) * scale };
  }
  // After release the trajectory is independent of the moving follow-through hand.
  const tip = getRodPose(getCastAngle(CAST_RELEASE_PROGRESS), releaseHand, scale);
  const start = { x: tip.x, y: tip.y + 15 * scale };
  const flight = (p - CAST_RELEASE_PROGRESS) / (1 - CAST_RELEASE_PROGRESS);
  return {
    x: start.x + (target.x - start.x) * flight,
    y: start.y + (target.y - start.y) * flight - Math.sin(flight * Math.PI) * 80 * scale,
  };
}
