# Brand artwork

- `approved-logo.png`: approved text-free chibi app logo. Rebuild logo, favicon,
  PWA icons and social card with `node tools/brand/build.mjs apps/web/public`.
- `undercover-badge.svg`: editable fictional star-and-lotus insignia. Change its
  paths, colors or gradients here, then run `node tools/char-art/pack-arrest.mjs`.
  This exports standalone SVG/transparent PNG badge and wallet images to
  `apps/web/public/brand/` and replaces the credentials in both arrest atlases.
- Wallet geometry and placement on the three reveal poses live in
  `tools/char-art/pack-arrest.mjs`; the original AI sprite sheets stay untouched.

Verify arrest art with `node --test tools/char-art/arrest.test.mjs`.
The app logo is an approved raster illustration; changing the standalone badge
does not repaint the badge inside that illustration.
