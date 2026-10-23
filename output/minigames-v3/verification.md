# Verification

- Workspace `pnpm typecheck`: passed.
- Web production `pnpm --filter @hidden-truth/web build`: passed.
- Server mini-game contracts + shared map tests: 18 passed, 0 failed.
- Browser interactions: all 12 games completed on desktop and mobile; each submitted answer accepted by the server validator, exactly once.
- Delayed-submit cancellation after unmount: passed. Browser total: 25 checks, 0 failures; see `results.json`.

Reproduce browser checks with `node --import tsx tools/smoke/minigames.ts` while Vite is running at `http://127.0.0.1:5173`. Requires installed Chrome (or `CHROME` executable override).
Rebuild vector assets with `node tools/paint/task-art.mjs`. Banner provenance and final image prompt: `art-direction.md`.

These checks cover generated task fixtures and emulated viewport/input behaviour; game feel still benefits from human playtesting.
