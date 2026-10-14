Implement The Hidden Truth in this repo. Content/spec already exists — do NOT rewrite a new GDD; follow the markdown specs as source of truth.

Read in order:
- prompts/opencode.md (models & tools)
- prompts/technology.md (stack, monorepo, 4-step workflow)
- prompts/cot-truyen-role.md (roles, tasks, meeting flow)
- prompts/map/co-do-hue.md (first map)
- prompts/assets.md (sizes, naming, manifests)

Code (agent build): TypeScript monorepo — Phaser client, Colyseus authoritative server, React UI for lobby/clues/meeting — exactly as technology.md describes. Use Claude Opus 5.5 for all implementation.

Assets: Do NOT draw gameplay art in code. For any new textures, use @assets or gpt_imagegen (ChatGPT Image plugin); obey assets.md (48×48 tiles, 48×64 avatar frames, kebab-case, update manifests/co-do-hue.assets.json).

Goal for this session: playable vertical slice — co-do-hue map, player movement + collision, at least one task station, minimal lobby/join room. Run dev servers and fix until the slice is playable.

If something is ambiguous, prefer cot-truyen-role.md + map doc over inventing new mechanics.