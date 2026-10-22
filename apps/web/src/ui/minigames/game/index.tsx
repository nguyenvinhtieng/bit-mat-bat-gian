import type { TaskData } from '@hidden-truth/shared';
import type { Submit } from '../common/kit';
import { PackCooler, DodgeSellers } from './tasks/food';
import { BrewCoffee, WifiHunt } from './tasks/drinks';
import { PumpTyre, PatchTube } from './tasks/garage';
import { TapeBox, StackRack } from './tasks/warehouse';
import { UnparkBike, FindTicket } from './tasks/parking';
import { DodgePotholes, HandoffPackage } from './tasks/alley';
import './tasks/tasks.css';

/** One mini-game per station (map game, "Hẻm 42: Cuốc Cuối"). */
export function GameMinigame({ task, submit }: { task: TaskData; submit: Submit }) {
  switch (task.taskId) {
    case 'pack_cooler':
      return <PackCooler task={task} submit={submit} />;
    case 'dodge_sellers':
      return <DodgeSellers task={task} submit={submit} />;
    case 'brew_coffee':
      return <BrewCoffee task={task} submit={submit} />;
    case 'wifi_hunt':
      return <WifiHunt task={task} submit={submit} />;
    case 'pump_tyre':
      return <PumpTyre task={task} submit={submit} />;
    case 'patch_tube':
      return <PatchTube task={task} submit={submit} />;
    case 'tape_box':
      return <TapeBox task={task} submit={submit} />;
    case 'stack_rack':
      return <StackRack task={task} submit={submit} />;
    case 'unpark_bike':
      return <UnparkBike task={task} submit={submit} />;
    case 'find_ticket':
      return <FindTicket task={task} submit={submit} />;
    case 'dodge_potholes':
      return <DodgePotholes task={task} submit={submit} />;
    case 'handoff_package':
      return <HandoffPackage task={task} submit={submit} />;
    default:
      return null;
  }
}
