import type { TaskData } from '@giao-keo/shared';
import type { Submit } from '../common/kit';
import { PackCooler } from './tasks/food';
import { BrewCoffee, WifiHunt } from './tasks/drinks';
import { PumpTyre, PatchTube } from './tasks/garage';
import { TapeBox, StackRack, ConnectWires } from './tasks/warehouse';
import { UnparkBike } from './tasks/parking';
import { DodgePotholes, HandoffPackage } from './tasks/alley';
import { UntangleCharger, StuckShutter, TuneAntenna, WaterPipes } from './tasks/errands';
import './tasks/tasks.css';

/** One mini-game per station (map game, "Hẻm 42: Cuốc Cuối"). */
export function GameMinigame({ task, submit }: { task: TaskData; submit: Submit }) {
  switch (task.taskId) {
    case 'connect_wires':
      return <ConnectWires task={task} submit={submit} />;
    case 'pack_cooler':
      return <PackCooler task={task} submit={submit} />;
    case 'untangle_charger':
      return <UntangleCharger task={task} submit={submit} />;
    case 'stuck_shutter':
      return <StuckShutter task={task} submit={submit} />;
    case 'tune_antenna':
      return <TuneAntenna task={task} submit={submit} />;
    case 'water_pipes':
      return <WaterPipes task={task} submit={submit} />;
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
    case 'dodge_potholes':
      return <DodgePotholes task={task} submit={submit} />;
    case 'handoff_package':
      return <HandoffPackage task={task} submit={submit} />;
    default:
      return null;
  }
}
