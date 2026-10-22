/** Dãy Quán Ăn: pack the cooler box · dodge the street sellers. */
import { useRef, useState } from 'react';
import { MgShell, sfx, useDragDrop, useShake, type Tone } from '../../common/kit';
import { useT, vnd } from '../art';
import { taskArt, useOnce, type P } from './shared';

// ================================================================== Xếp đơn vào thùng giữ nhiệt
export function PackCooler({ task, submit }: P<'pack_cooler'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [placed, setPlaced] = useState<Record<string, string>>({}); // itemId -> slotId
  const [sel, setSel] = useState('');
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const slotOf = (id: string) => task.slots.find((s) => s.id === id)!;
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
    setHint(['', 'info']);
    if (Object.keys(next).length === task.items.length) {
      setHint([t('Đủ món! Đóng nắp…', 'All in! Closing the lid…'), 'ok']);
      send(next);
    }
  };
  const dnd = useDragDrop<string>(put, (id) => setSel((s) => (s === id ? '' : id)));
  const loose = task.items.filter((i) => !placed[i.id]);
  const zone = (kind: 'cup' | 'bottom' | 'shelf') =>
    task.slots
      .filter((s) => s.kind === kind)
      .map((s) => {
        const it = itemIn(s.id);
        return (
          <div key={s.id} data-drop={s.id} className={`ck-slot ${kind} ${dnd.over === s.id ? 'over' : ''}`} onClick={() => sel && put(sel, s.id)}>
            {it && <img src={taskArt(task.taskId, it.kind)} alt={it.name} />}
          </div>
        );
      });

  return (
    <MgShell taskId={task.taskId} status={`${Object.keys(placed).length}/${task.items.length}`} hint={hint[0]} tone={hint[1]}>
      <div className="ck-cooler-wrap">
        <ul className="ck-bill">
          <b>{t('Ghi chú của khách', 'Customer notes')}</b>
          {task.bill.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className={`ck-cooler ${shake}`}>
          <div className="ck-zone cups">{zone('cup')}</div>
          <div className="ck-zone shelf">{zone('shelf')}</div>
          <div className="ck-zone bottom">{zone('bottom')}</div>
        </div>
      </div>
      <div className="ck-tray">
        {loose.map((it) => (
          <button key={it.id} className={`ck-item ${sel === it.id ? 'sel' : ''}`} {...dnd.source(it.id, <img src={taskArt(task.taskId, it.kind)} alt="" />, sent)}>
            <img src={taskArt(task.taskId, it.kind)} alt="" draggable={false} />
            <span>{it.name}</span>
          </button>
        ))}
      </div>
      {dnd.ghost}
    </MgShell>
  );
}

// ================================================================== Né "tiếp thị dạo"
const SWIPE_PX = 70;
/** a card has to be on screen this long before it can be swiped (people need a moment to read the line) */
const ARRIVE_MS = 650;

export function DodgeSellers({ task, submit }: P<'dodge_sellers'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const [hint, setHint] = useState('');
  const shownAt = useRef(performance.now());
  const drag = useRef<{ x0: number } | null>(null);
  const owner = i >= task.sellers.length;
  const s = task.sellers[i];

  const next = () => {
    if (performance.now() - shownAt.current < ARRIVE_MS) return setHint(t('Từ từ, để người ta nói hết câu đã…', 'Easy — let them finish talking…'));
    sfx.scrape();
    setHint(pickNo(t));
    setI((v) => v + 1);
    setDx(0);
    shownAt.current = performance.now();
  };
  const pay = () => {
    if (performance.now() - shownAt.current < ARRIVE_MS) return;
    sfx.ok();
    setHint(t('Trả rồi nha! Giờ thì đi lấy đơn.', 'Paid! Now go get that order.'));
    send({ swiped: task.sellers.map((x) => x.id), paid: true });
  };

  return (
    <MgShell taskId={task.taskId} status={`${Math.min(i, task.sellers.length)}/${task.sellers.length}`} hint={hint}>
      <div className="ck-sellers">
        {!owner ? (
          <div
            key={s.id}
            className="ck-seller"
            style={{ transform: `translateX(${dx}px) rotate(${dx / 12}deg)`, opacity: 1 - Math.min(0.6, Math.abs(dx) / 300) }}
            onPointerDown={(e) => ((drag.current = { x0: e.clientX }), e.currentTarget.setPointerCapture(e.pointerId))}
            onPointerMove={(e) => drag.current && setDx(e.clientX - drag.current.x0)}
            onPointerUp={() => {
              drag.current = null;
              if (Math.abs(dx) > SWIPE_PX) next();
              else setDx(0);
            }}
          >
            <img src={taskArt(task.taskId, s.kind)} alt="" draggable={false} />
            <b>{s.name}</b>
            <q>{s.line}</q>
          </div>
        ) : (
          <div className="ck-seller owner">
            <img src={taskArt(task.taskId, 'owner')} alt="" draggable={false} />
            <b>{task.owner.name}</b>
            <q>{task.owner.line}</q>
            <button className="ck-cash" disabled={sent} onClick={pay}>
              💵 {t('Trả', 'Pay')} {vnd(task.owner.debt)}
            </button>
          </div>
        )}
        {!owner && (
          <div className="ck-swipe-row">
            <button onClick={next}>← {t('Lắc đầu', 'Shake head')}</button>
            <button onClick={next}>{t('Cười trừ', 'Smile, no')} →</button>
          </div>
        )}
      </div>
    </MgShell>
  );
}

const pickNo = (t: (vi: string, en: string) => string) => {
  const lines = [
    t('Dạ thôi, con cảm ơn!', 'No thanks, ma’am!'),
    t('Lần sau nha cô!', 'Next time!'),
    t('Hết tiền rồi chú ơi…', 'I’m broke, sorry…'),
    t('Con đang chạy đơn, hì.', 'On a delivery, hehe.'),
  ];
  return lines[Math.floor(Math.random() * lines.length)];
};
