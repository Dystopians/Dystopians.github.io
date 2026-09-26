# Byte Fisher: Neon Harbor

Version: beta0.11.1. Base revision: 7982e3a, fetched from origin/NewPage.

## Scope

- New harbor and underwater backgrounds, one transparent angler, twelve fish sprites and four equipment icons. Runtime files are in `src/assets/harbor`; their original images, exact prompts and crop specifications are retained there.
- Shared scene layout anchors the deck, feet, hand, rod tip and float. Inventory icons are no longer composited onto the character. Equipment levels still affect gameplay; rod upgrades also change the rod accent.
- Responsive HUD, icon controls, consistent modal styling, localized catalog tabs, keyboard dialog controls and a scrollable landscape message composer.
- Minigame callbacks no longer restart its simulation when the parent renders. Visible fish centers match catch detection, fish bounds account for track height, pointer cancellation releases input, and keyboard input is supported.
- Cast release is continuous, fish swimming uses elapsed time, and canvas backing resolution follows display pixel density. Audio does not preload before use.
- A new 12-pose full-body character atlas covers breathing, anticipation, backswing, release, follow-through, waiting, hook-set, reeling, lifting and presenting. Hands and pole use per-frame anchors; boots share a fixed deck baseline. The actual caught item lands at the open palm before the result appears. Source, exact prompt and preparation details are in `src/assets/harbor/ANGLER_ACTIONS.md`.

## Local Run

Install dependencies with `pnpm install`. Run `pnpm dev --host 127.0.0.1 --port 4174` for development. Run `pnpm build` followed by `pnpm preview --host 127.0.0.1 --port 4173` for the production preview.

The original checkout had unrelated uncommitted work. This repair lives in the sibling `byte-fisher-refresh` worktree on `codex/byte-fisher-refresh`; existing local fishing changes were carried into it before editing. The original working files were not overwritten. No remote publish or push was performed.

## Verification

- `pnpm typecheck`
- `pnpm test`: actor bounds, foot-to-pier contact, hand attachment, rod angles, release continuity and landing position at six viewport sizes.
- `pnpm test:visual`: requires the local preview at port 4173 and Microsoft Edge. `BASE_URL` and `BROWSER_CHANNEL` can override those defaults. The script uses isolated browser contexts, so it does not alter the player's saved browser data.
- `pnpm test:animation`: deterministic desktop, mobile and landscape action screenshots, real character-pixel changes, and a nine-pose contact sheet in `test-results/angler/`.
- Browser coverage: 320x568, 390x844, 768x1024, 844x390, 1440x900 and 2560x1440; four menus plus composer and board views; level-one and level-five catches; cancellation; deterministic no-input failure; resizing during reeling; and 2x pixel density.
- Screenshots and the run report are written to ignored `test-results/harbor/`. The browser test visits message-board views but never publishes messages to the remote service.
- Catch tests verify that lifting and presentation are visible before the modal, claiming restores idle, and a new cast cannot reopen the old result.

This local worktree currently shares an existing dependency directory via a junction. If pnpm requests a reinstall because of that directory, build directly with `node node_modules/vite/bin/vite.js build`, and run test scripts with `node scripts/verify-harbor.mjs` or `node scripts/verify-angler.mjs`. Do not purge the shared dependency directory.

`pnpm assets:harbor` reproduces the alpha-preserving cutouts and lossless WebP conversion from the saved imagegen sources. It rejects an empty or clipped atlas cell.
