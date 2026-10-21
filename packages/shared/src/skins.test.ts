import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_SLUG, MAP_SKINS, ROLE_IDS } from './index';

test('the game world has a skin', () => {
  assert.ok(MAP_SKINS[GAME_SLUG]);
});

test('skin names roles, segments and deadline in both languages', () => {
  const skin = MAP_SKINS[GAME_SLUG];
  for (const id of ROLE_IDS) assert.ok(skin.roles[id].name && skin.roles[id].nameEn, id);
  for (const k of ['segment', 'deadline'] as const) assert.ok(skin.labels[k].vi && skin.labels[k].en, k);
});

test('skin has a task-card eyebrow', () => {
  const skin = MAP_SKINS[GAME_SLUG];
  assert.ok(skin.taskEyebrow?.vi && skin.taskEyebrow.en);
});
