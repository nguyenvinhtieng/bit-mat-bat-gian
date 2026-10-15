import type { TaskData } from '@hidden-truth/shared';
import { MoonPhase, RoyalSeal, WoodblockPrint } from './calendar';
import { CourtRanks, NgoMonGates, NhaNhac } from './ceremony';
import { BanhBeo, CuuDinh, PoemWall } from './heritage';
import type { Submit } from './kit';

/** One mini-game per task station (map co-do-hue, "Năm Canh Trước Bình Minh"). */
export function Minigame({ task, submit }: { task: TaskData; submit: Submit }) {
  switch (task.taskId) {
    case 'task_moon_phase':
      return <MoonPhase task={task} submit={submit} />;
    case 'task_woodblock_print':
      return <WoodblockPrint task={task} submit={submit} />;
    case 'task_ngo_mon_gates':
      return <NgoMonGates task={task} submit={submit} />;
    case 'task_court_ranks':
      return <CourtRanks task={task} submit={submit} />;
    case 'task_nha_nhac':
      return <NhaNhac task={task} submit={submit} />;
    case 'task_cuu_dinh':
      return <CuuDinh task={task} submit={submit} />;
    case 'task_poem_wall':
      return <PoemWall task={task} submit={submit} />;
    case 'task_royal_seal':
      return <RoyalSeal task={task} submit={submit} />;
    case 'task_banh_beo':
      return <BanhBeo task={task} submit={submit} />;
  }
}
