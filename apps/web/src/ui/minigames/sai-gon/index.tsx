import type { TaskData } from '@hidden-truth/shared';
import { ChiDuong, TiengRao } from './hem';
import { ComTam, CaPhePhin } from './quan';
import { DoXang, VaVo } from './tiem';
import { SoHui, DemTien, KhuiHui } from './hui';
import { XepXe } from './bai';
import type { Submit } from '../common/kit';

/** One mini-game per task station (map sai-gon, "Hụi Sài Gòn · Hẻm 42"). */
export function SgMinigame({ task, submit }: { task: TaskData; submit: Submit }) {
  switch (task.taskId) {
    case 'task_chi_duong':
      return <ChiDuong task={task} submit={submit} />;
    case 'task_tieng_rao':
      return <TiengRao task={task} submit={submit} />;
    case 'task_com_tam':
      return <ComTam task={task} submit={submit} />;
    case 'task_ca_phe_phin':
      return <CaPhePhin task={task} submit={submit} />;
    case 'task_do_xang':
      return <DoXang task={task} submit={submit} />;
    case 'task_va_vo':
      return <VaVo task={task} submit={submit} />;
    case 'task_so_hui':
      return <SoHui task={task} submit={submit} />;
    case 'task_dem_tien':
      return <DemTien task={task} submit={submit} />;
    case 'task_khui_hui':
      return <KhuiHui task={task} submit={submit} />;
    case 'task_xep_xe':
      return <XepXe task={task} submit={submit} />;
    default:
      return null;
  }
}
