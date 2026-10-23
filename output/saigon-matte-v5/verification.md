# Final verification

- 45/45 independently generated sprites with genuine alpha; all used in 77 map placements.
- Source PNG sprites, atlas PNG, and runtime lossless WebP visible pixels match.
- Floor PNG/WebP and collision-layout SHA-256 match `protected-baseline.json`.
- `body` and `body-tint` atlas pixels match Git HEAD.
- Refresh and preparation self-tests pass; movement tests 8/8; shared tests 25/25; workspace typecheck passes.
- Nine live Chrome captures inspected with the actual rider as scale reference.
- Zero page, console, HTTP, or failed-request errors (`live-errors.json`).

Run shared tests directly with `node --import tsx --test packages/shared/src/*.test.ts` when the pnpm tsx wrapper cannot create its sandbox IPC socket.
