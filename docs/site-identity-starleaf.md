# Starleaf / 星页

The personal-site identity pairs an open book with an off-centre four-point star:
knowledge and writing, with curiosity and discovery. The mark deliberately uses
recognizable shapes rather than a layered initialism. Vermilion `#B94032` and
warm paper `#FFF8EB` provide a compact, two-colour signature on light and dark backgrounds.

## Editable sources and exports

- `images/logo-peilin.svg`: main vector artwork; used directly in the masthead.
- `images/favicon.svg`: optical small-size artwork with a wider book crease,
  larger star and simpler corners. Used by modern browsers and the 16/32px exports.
- `scripts/generate-brand-assets.cjs`: regenerates PNG and ICO exports using Node.js
  and `sharp`. Run `node scripts/generate-brand-assets.cjs` with `sharp` available.
- Legacy PNG/ICO filenames also contain the new identity so old references cannot
  resurrect the previous artwork. Raster links use a version query for cache refresh.
- Apple touch artwork has an opaque background; the separate maskable icon keeps
  the foreground inside the central safe circle. Regular icons retain transparent corners.

## Integration and validation

- Masthead uses a fixed-ratio SVG and a home-link accessible name, including when
  the text label is hidden on smaller screens. Existing navigation sizing is preserved.
- Browser icons, Apple touch icon and web manifest use the same identity.
- Rendered current Liquid navigation and head templates with LiquidJS, compiled
  current Sass with Dart Sass, and loaded the site's existing navigation scripts
  in Chrome. Tested at 320, 390, 768 and 1440px in light and dark themes.
- Confirmed loaded SVG, square in-bounds mark, no horizontal overflow, working theme
  toggle, valid home-link name, no browser errors or failed local requests, successful
  icon URLs, manifest image dimensions and four embedded ICO sizes (16/32/48/256).
- Inspected screenshots and small-size artwork visually. Local preview and reports
  live in ignored `local/logo-review/`.
- This is component-level validation, not a full Jekyll build: the local Ruby is
  3.1.7 while the Gemfile requires 3.1.4, and Jekyll gems are not installed. No project
  dependency files were changed to work around that environment mismatch.
