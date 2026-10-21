#!/usr/bin/env node
/** Verifies that every file referenced by the manifest exists in apps/web/public/assets. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const PUB = path.join(ROOT, 'apps/web/public/assets');
const manifest = JSON.parse(fs.readFileSync(path.join(PUB, 'maps/co-do-hue/co-do-hue.assets.json'), 'utf8'));

const errors = [];
const need = (rel) => {
  if (!fs.existsSync(path.join(PUB, rel))) errors.push(`missing: ${rel}`);
};

const atlasFrames = new Map();
for (const a of manifest.atlases ?? []) {
  need(`${a.file}.webp`);
  need(`${a.file}.json`);
  const jf = path.join(PUB, `${a.file}.json`);
  if (fs.existsSync(jf)) {
    const j = JSON.parse(fs.readFileSync(jf, 'utf8'));
    const frames = Array.isArray(j.frames) ? j.frames.map((f) => f.filename) : Object.keys(j.frames ?? {});
    atlasFrames.set(path.basename(a.file), new Set(frames));
  }
}
for (const [k, t] of Object.entries(manifest.textures ?? {})) {
  if (t.file) need(t.file);
  if (t.atlas) { need(`${t.atlas}.webp`); need(`${t.atlas}.json`); }
  if (t.tint) { need(`${t.tint}.webp`); need(`${t.tint}.json`); }
}
for (const [name, p] of Object.entries(manifest.props ?? {})) {
  const fr = atlasFrames.get(p.atlas);
  if (!fr) errors.push(`prop ${name}: unknown atlas ${p.atlas}`);
  else if (!fr.has(name)) errors.push(`prop ${name}: frame not in atlas ${p.atlas}`);
}

if (errors.length) {
  console.error('[check] FAILED\n' + errors.map((e) => '  ' + e).join('\n'));
  process.exit(1);
}
console.log('[check] ok');
