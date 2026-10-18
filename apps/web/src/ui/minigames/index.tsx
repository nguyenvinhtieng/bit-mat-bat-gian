import { MAP_SKINS, type TaskData } from '@hidden-truth/shared';
import type { ComponentType } from 'react';
import { HueMinigame } from './co-do-hue';
import type { Submit } from './common/kit';
import { TlMinigame } from './thang-long';
import { SgMinigame } from './sai-gon';

type MinigameUI = ComponentType<{ task: TaskData; submit: Submit }>;

/** Mini-game UI per map slug. New map: add ui/minigames/<slug>/index.tsx and register it here. */
const BY_MAP: Record<string, MinigameUI> = {
  'co-do-hue': HueMinigame,
  'thang-long': TlMinigame,
  'sai-gon': SgMinigame,
};

/** Task ids are unique across maps, so the task alone tells which map's UI to render. */
export function Minigame({ task, submit }: { task: TaskData; submit: Submit }) {
  const slug = Object.values(MAP_SKINS).find((s) => s.taskIds.includes(task.taskId))?.slug;
  const UI = slug ? BY_MAP[slug] : undefined;
  return UI ? <UI task={task} submit={submit} /> : null;
}
