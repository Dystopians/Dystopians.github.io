# Angler Animation

Generated using the built-in imagegen tool, referencing `angler-source.png` for identity, costume and palette. The original transparent output is saved as `angler-actions-source.png`; no remote asset is needed at runtime.

## Runtime Assets

- `angler-actions.png`: 12 poses in a 4 by 3 atlas, 640 by 528 pixels with real alpha.
- `angler-actions.json`: inspected hand/free-hand anchors, source rectangles and the common foot baseline.
- Every 160 by 176 cell shares the foot anchor (64, 168). A single scale preserves crouching rather than stretching every pose to standing height.
- `scripts/prepare-angler-actions.cjs` repacks the source with nearest-neighbor resizing. Its individual source rectangles account for the release pose extending beyond the nominal grid gutter. Run `pnpm assets:angler` to reproduce the atlas and metadata.

## Playback

Idle/breathing, casting anticipation, backswing, release, follow-through, waiting, hook-set, two reeling poses, lifting and presenting are driven by the existing game state. The rod starts at the active frame's hand and the line starts at its tip. Cast flight freezes its release anchor, so following through cannot pull the airborne float backwards. Cancel/failure/claim use a short recovery. Equipment stats remain unchanged and icons are never composited over limbs.

The actual caught item is lifted from the water to the open palm before the result dialog appears. The scene notifies the app after 1.35 seconds of displayed landing animation instead of racing a separate modal timeout.

## Generation Prompt

Use case: stylized-concept.
Asset type: production transparent pixel-art animation sprite sheet for an existing cyberpunk harbor fishing game.
Reference image 1 is the identity and costume reference, not a backdrop. Preserve exactly this young adult angler: coral knit beanie, short dark hair, cream technical jacket with teal lower sleeves, charcoal cargo trousers, dark ankle boots with teal soles, integrated small teal backpack. Same face, natural slim proportions, same pixel-art palette in EVERY frame.
Create EXACTLY TWELVE full-body animation frames in a strict 4-column by 3-row equal-cell grid, square 1536x1536 transparent PNG. Every cell is 384x512, all characters face RIGHT in the same side-three-quarter perspective. Fixed camera, no zoom, no changing character proportions. Feet planted in a stable wide stance with soles at local y=465 in every cell and feet center local x=174. Use about 340 pixels for the standing body height. Knees flex and torso twists, leans, and shoulders move naturally through the action, but feet do not slide. Leave very generous transparent gutters. Crisp deliberate hand-crafted 16-bit pixel art, NOT smooth illustration, NOT 3D. Clean hard pixels, no glow or shadows.
Reading order left-to-right then top-to-bottom:
Frame 0: relaxed idle, knees soft, both hands forward waist height holding an INVISIBLE fishing rod grip.
Frame 1: idle inhale, shoulders slightly raised, same grip.
Frame 2: anticipation: knees bend deeper, body leans slightly back, both hands drawn toward chest.
Frame 3: backswing: torso coils back, arms and empty grip raised by the RIGHT side of head, preparing an overhead cast.
Frame 4: forward release: body leans forward, both arms extend to the RIGHT at shoulder height, hands gripping empty air.
Frame 5: follow-through: body forward, knees flexed, arms extended downward-right at chest height.
Frame 6: waiting: relaxed alert stance, one hand holding empty grip forward at waist, other hand below near the imaginary reel.
Frame 7: bite/hook set: knees flexed, torso braced back, both hands pulled toward upper chest, alert expression.
Frame 8: reeling A: torso slightly back, front hand grips at mid-chest forward, other hand lower turning imaginary reel.
Frame 9: reeling B: same grip hand position, shoulders shift and other hand is on the upper part of the imaginary reel circle.
Frame 10: lift catch: standing tall, one hand gripping empty air raised forward near shoulder, free hand extends RIGHT toward incoming catch.
Frame 11: proud finish: relaxed upright, warm small smile, raised gripping hand still near shoulder, free hand open below as if presenting an INVISIBLE fish.
The hands must be distinct and natural, the main gripping hand is the hand farthest RIGHT except frames 10-11 where the free hand reaches farther right. Match clothing all frames. All faces point RIGHT.
ABSOLUTELY NO fishing rods, poles, line, bobbers, fish, water, scenery, labels, numbers, text, grids, frame borders, or ground. The rod, line, fish are attached by the game renderer. True transparent alpha background around all figures. One isolated complete figure per cell. No overlap across cells. Never cut off boots, fingers or hats.
