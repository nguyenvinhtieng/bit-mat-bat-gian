import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAP_CATALOG, MAP_SKINS, ROLE_IDS } from './index';

test('every playable map has a skin', () => {
  for (const m of MAP_CATALOG.filter((x) => x.available)) assert.ok(MAP_SKINS[m.slug], m.slug);
  assert.ok(MAP_CATALOG.find((m) => m.slug === 'thang-long')?.available, 'thang-long is open');
  assert.ok(MAP_CATALOG.find((m) => m.slug === 'sai-gon')?.available, 'sai-gon is open');
});

test('every skin names its roles, segments and deadline in both languages', () => {
  for (const skin of Object.values(MAP_SKINS)) {
    for (const id of ROLE_IDS) assert.ok(skin.roles[id].name && skin.roles[id].nameEn, `${skin.slug} ${id}`);
    for (const k of ['segment', 'deadline'] as const) assert.ok(skin.labels[k].vi && skin.labels[k].en, `${skin.slug} ${k}`);
  }
});

test('every skin but Huế words its own task-card eyebrow', () => {
  for (const skin of Object.values(MAP_SKINS)) {
    if (skin.slug === 'co-do-hue') continue;
    assert.ok(skin.taskEyebrow?.vi && skin.taskEyebrow.en, skin.slug);
    assert.ok(!skin.taskEyebrow.vi.includes('Ban Sóc'), skin.slug);
  }
});

test('the Thăng Long skin never leaks Huế names', () => {
  const text = JSON.stringify(MAP_SKINS['thang-long']);
  for (const w of ['Âm Binh', 'Ngự Lâm', 'Ngũ Phụng', 'Huế', 'canh năm', 'Shadow']) assert.ok(!text.includes(w), w);
});
