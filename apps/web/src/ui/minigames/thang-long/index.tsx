import type { TaskData } from '@hidden-truth/shared';
import { BanhChung, CayNeu, NguQua } from './kitchen';
import { CaTru, RoiNuoc } from './stage';
import { CauDoi, ChoChu, DongHo } from './street';
import type { Submit } from '../common/kit';

/** One mini-game per task station (map thang-long, "Hồ Gươm · Đêm Giao Thừa"). */
export function TlMinigame({ task, submit }: { task: TaskData; submit: Submit }) {
  switch (task.taskId) {
    case 'task_banh_chung':
      return <BanhChung task={task} submit={submit} />;
    case 'task_dong_ho':
      return <DongHo task={task} submit={submit} />;
    case 'task_cho_chu':
      return <ChoChu task={task} submit={submit} />;
    case 'task_cay_neu':
      return <CayNeu task={task} submit={submit} />;
    case 'task_cau_doi':
      return <CauDoi task={task} submit={submit} />;
    case 'task_ngu_qua':
      return <NguQua task={task} submit={submit} />;
    case 'task_ca_tru':
      return <CaTru task={task} submit={submit} />;
    case 'task_roi_nuoc':
      return <RoiNuoc task={task} submit={submit} />;
    default:
      return null;
  }
}
