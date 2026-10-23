/** Dãy Quán Ăn: pack the cooler box. */
import { useState } from 'react';
import { MgShell, sfx, useDragDrop, useShake, type Tone } from '../../common/kit';
import { useT } from '../art';
import { taskArt, useOnce, type P } from './shared';

// ================================================================== Xếp đơn vào thùng giữ nhiệt
export function PackCooler({ task, submit }: P<'pack_cooler'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [placed, setPlaced] = useState<Record<string, string>>({}); // itemId -> slotId
  const [sel, setSel] = useState('');
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const itemIn = (slotId: string) => task.items.find((i) => placed[i.id] === slotId);

  const put = (itemId: string, slotId: string) => {
    const it = task.items.find((i) => i.id === itemId);
    const slot = task.slots.find((s) => s.id === slotId);
    if (!it || !slot || sent) return;
    if (itemIn(slotId)) return setHint([t('Ô này có món rồi.', 'That spot is taken.'), 'bad']);
    if (slot.kind !== it.need) {
      sfx.bad();
      doShake();
      const why =
        it.need === 'cup'
          ? t(`${it.name} mà nằm ngang là đổ hết. Cắm vô ô giữ ly!`, `${it.name} lying flat will spill. Put it in a cup holder!`)
          : it.need === 'bottom'
            ? t('Nước lèo để trên là chảy xuống cơm tấm đó!', 'Soup on top drips onto the rice!')
            : t('Đồ khô để trên kệ, đáy thùng dành cho nước lèo.', 'Dry food goes on the shelf, the bottom is for soup.');
      return setHint([why, 'bad']);
    }
    sfx.ok();
    const next = { ...placed, [itemId]: slotId };
    setPlaced(next);
    setSel('');
    setHint([t('Đúng chỗ rồi! Chọn món tiếp theo.', 'Nice fit! Choose the next item.'), 'ok']);
    if (Object.keys(next).length === task.items.length) {
      setHint([t('Đủ món! Đóng nắp…', 'All in! Closing the lid…'), 'ok']);
      send(next);
    }
  };
  const dnd = useDragDrop<string>(put, (id) => setSel((s) => (s === id ? '' : id)));
  const loose = task.items.filter((i) => !placed[i.id]);
  const active = task.items.find((i) => i.id === (dnd.dragging ?? sel));
  const firstMove = Object.keys(placed).length === 0 && !active;
  const zone = (kind: 'cup' | 'bottom' | 'shelf') =>
    task.slots
      .filter((s) => s.kind === kind)
      .map((s) => {
        const it = itemIn(s.id);
        const preview = active?.need === kind ? active : loose.find((item) => item.need === kind);
        const suggested = !it && active?.need === kind;
        return (
          <button key={s.id} type="button" data-drop={s.id} disabled={sent}
            className={`ck-slot ${kind} ${dnd.over === s.id ? 'over' : ''} ${suggested ? 'suggested' : ''} ${firstMove && preview?.id === loose[0]?.id ? 'demo-target' : ''}`}
            aria-label={it ? t(`${it.name}, nhấn để lấy ra`, `${it.name}, press to remove`) : t(`Ô trống: ${kind === 'cup' ? 'giữ ly' : kind === 'bottom' ? 'nước lèo' : 'đồ khô'}`, `Empty ${kind} slot`)}
            onClick={() => {
              if (sel) put(sel, s.id);
              else if (it) {
                setPlaced((prev) => { const next = { ...prev }; delete next[it.id]; return next; });
                setSel(it.id);
                setHint([t('Đã lấy ra. Chọn ô khác để xếp lại.', 'Removed. Choose another slot.'), 'info']);
              } else setHint([t('Chọn một món bên dưới trước nhé.', 'Choose an item below first.'), 'bad']);
            }}>
            {it ? <img src={taskArt(task.taskId, it.kind)} alt={it.name} /> : preview && <span className="ck-slot-preview" aria-hidden="true" style={{ backgroundImage: `url(${taskArt(task.taskId, preview.kind)})` }} />}
            {suggested && <span className="ck-slot-drop" aria-hidden="true">↓</span>}
          </button>
        );
      });

  return (
    <MgShell bare taskId={task.taskId} status={`${Object.keys(placed).length}/${task.items.length}`} hint={hint[0]} tone={hint[1]}>
      <div className="ck-cooler-wrap">
        <div className={`ck-cooler ${shake}`}>
          <span className="ck-zone-label">{t('GIỮ LY · ĐỂ ĐỨNG', 'CUP HOLDERS · UPRIGHT')}</span>
          <div className="ck-zone cups">{zone('cup')}</div>
          <span className="ck-zone-label">{t('KỆ TRÊN · ĐỒ KHÔ', 'TOP SHELF · DRY FOOD')}</span>
          <div className="ck-zone shelf">{zone('shelf')}</div>
          <span className="ck-zone-label">{t('ĐÁY THÙNG · NƯỚC LÈO', 'BOTTOM · SOUP')}</span>
          <div className="ck-zone bottom">{zone('bottom')}</div>
        </div>
      </div>
      <div className="ck-tray">
        {loose.map((it) => (
          <button key={it.id} type="button" disabled={sent} aria-pressed={sel === it.id}
            onClick={(e) => { if (e.detail === 0) setSel((s) => s === it.id ? '' : it.id); }}
            className={`ck-item ${sel === it.id ? 'sel' : ''} ${firstMove && it.id === loose[0]?.id ? 'demo-source' : ''}`} {...dnd.source(it.id, <img src={taskArt(task.taskId, it.kind)} alt="" />, sent)}>
            <span className="ck-item-grip" aria-hidden="true">⠿</span>
            <img src={taskArt(task.taskId, it.kind)} alt="" draggable={false} />
            <span>{it.name}</span>
          </button>
        ))}
      </div>
      {dnd.ghost}
    </MgShell>
  );
}
