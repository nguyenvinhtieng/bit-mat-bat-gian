import type { TaskData } from '@hidden-truth/shared';
import type { Submit } from './common/kit';
import { GameMinigame } from './game';

/** Task UI for the Alley 42 world (task ids are unique). */
export function Minigame({ task, submit }: { task: TaskData; submit: Submit }) {
  return <GameMinigame task={task} submit={submit} />;
}
