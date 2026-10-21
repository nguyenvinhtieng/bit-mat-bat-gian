import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_SLUG, MAP_SKINS, ROLE_IDS } from './index';

test('the game world has a skin', () => {
  assert.ok(MAP_SKINS[GAME_SLUG]);
});

test('skin names roles, factions and deadline in both languages', () => {
  const skin = MAP_SKINS[GAME_SLUG];
  for (const id of ROLE_IDS) assert.ok(skin.roles[id].name && skin.roles[id].nameEn, id);
  assert.ok(skin.labels.deadline.vi && skin.labels.deadline.en);
  assert.ok(skin.crewName.vi && skin.killerName.vi);
});

test('skin has a task-card eyebrow', () => {
  const skin = MAP_SKINS[GAME_SLUG];
  assert.ok(skin.taskEyebrow?.vi && skin.taskEyebrow.en);
});
