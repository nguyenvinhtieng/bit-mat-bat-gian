import type { TaskData } from '@hidden-truth/shared';
import { ReceivePackage, CheckSeal, DecodeAddress, PlanRoute, PrepareBike, PackDisguise, ConfirmRecipient, HandoffPackage } from './prep';
import type { Submit } from '../common/kit';

/** One mini-game per station (map game, "Hẻm 42: Cuốc Cuối"). */
export function GameMinigame({ task, submit }: { task: TaskData; submit: Submit }) {
  switch (task.taskId) {
    case 'receive_package':
      return <ReceivePackage task={task} submit={submit} />;
    case 'check_seal':
      return <CheckSeal task={task} submit={submit} />;
    case 'decode_address':
      return <DecodeAddress task={task} submit={submit} />;
    case 'plan_route':
      return <PlanRoute task={task} submit={submit} />;
    case 'prepare_bike':
      return <PrepareBike task={task} submit={submit} />;
    case 'pack_disguise':
      return <PackDisguise task={task} submit={submit} />;
    case 'confirm_recipient':
      return <ConfirmRecipient task={task} submit={submit} />;
    case 'handoff_package':
      return <HandoffPackage task={task} submit={submit} />;
    default:
      return null;
  }
}
