/** Dãy Quán Ăn: pack the cooler box · dodge the street sellers. */
import { useEffect, useRef, useState } from 'react';
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
  const zone = (kind: 'cup' | 'bottom' | 'shelf') =>
    task.slots
      .filter((s) => s.kind === kind)
      .map((s) => {
        const it = itemIn(s.id);
        return (
          <button key={s.id} type="button" data-drop={s.id} disabled={sent}
            className={`ck-slot ${kind} ${dnd.over === s.id ? 'over' : ''}`}
            aria-label={it ? t(`${it.name}, nhấn để lấy ra`, `${it.name}, press to remove`) : t(`Ô trống: ${kind === 'cup' ? 'giữ ly' : kind === 'bottom' ? 'nước lèo' : 'đồ khô'}`, `Empty ${kind} slot`)}
            onClick={() => {
              if (sel) put(sel, s.id);
              else if (it) {
                setPlaced((prev) => { const next = { ...prev }; delete next[it.id]; return next; });
                setSel(it.id);
                setHint([t('Đã lấy ra. Chọn ô khác để xếp lại.', 'Removed. Choose another slot.'), 'info']);
              } else setHint([t('Chọn một món bên dưới trước nhé.', 'Choose an item below first.'), 'info']);
            }}>
            {it && <img src={taskArt(task.taskId, it.kind)} alt={it.name} />}
          </button>
        );
      });

  return (
    <MgShell taskId={task.taskId} status={`${Object.keys(placed).length}/${task.items.length}`} hint={hint[0] || t('Kéo món vào đúng ngăn, hoặc chọn món rồi chọn ô. Nhấn món đã xếp để lấy ra.', 'Drag into the right zone, or select an item then a slot. Press a packed item to remove it.')} tone={hint[1]}>
      <div className="ck-cooler-wrap">
        <ul className="ck-bill">
          <b>{t('Ghi chú của khách', 'Customer notes')}</b>
          {task.bill.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
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
            className={`ck-item ${sel === it.id ? 'sel' : ''}`} {...dnd.source(it.id, <img src={taskArt(task.taskId, it.kind)} alt="" />, sent)}>
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
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const timer = window.setTimeout(() => setReady(true), ARRIVE_MS);
    return () => window.clearTimeout(timer);
  }, [i]);
  const shownAt = useRef(performance.now());
  const drag = useRef<{ x0: number } | null>(null);
  const owner = i >= task.sellers.length;
  const s = task.sellers[i];

  const next = () => {
    if (sent || owner) return;
    if (performance.now() - shownAt.current < ARRIVE_MS) return setHint(t('Từ từ, để người ta nói hết câu đã…', 'Easy — let them finish talking…'));
    sfx.scrape();
    setHint(pickNo(t));
    setI((v) => v + 1);
    setDx(0);
    shownAt.current = performance.now();
  };
  const pay = () => {
    if (sent || !owner) return;
    if (performance.now() - shownAt.current < ARRIVE_MS) return;
    sfx.ok();
    setHint(t('Trả rồi nha! Giờ thì đi lấy đơn.', 'Paid! Now go get that order.'));
    send({ swiped: task.sellers.map((x) => x.id), paid: true });
  };

  const choose = (paying: boolean) => {
    if (!ready || sent) return;
    setDx(0);
    if (paying === owner) return paying ? pay() : next();
    sfx.bad();
    setHint(owner
      ? t('Chủ quán đang nhắc nợ trà đá. Trả tiền rồi mới đi nhé!', 'The owner is collecting your iced-tea debt. Pay before leaving!')
      : t('Đang chạy đơn mà! Từ chối lịch sự để kịp giờ.', 'You have a delivery! Politely decline to stay on schedule.'));
  };
  return (
    <MgShell taskId={task.taskId} status={`${Math.min(i, task.sellers.length)}/${task.sellers.length}`}
      hint={hint || t('Khách mời mua: vuốt trái để từ chối. Gặp chủ quán: vuốt phải để trả nợ.', 'Sales pitch: swipe left to decline. The owner: swipe right to settle your debt.')}>
      <div className="ck-seller-progress" aria-label={t('Tiến độ chờ đơn', 'Order queue progress')}>
        {task.sellers.map((seller, index) => <span key={seller.id} aria-label={`${index + 1}`} style={{ opacity: index < i ? 1 : .3 }}>●</span>)}
        <span style={{ opacity: owner ? 1 : .3 }}>◆</span>
      </div>
      <div className="ck-sellers">
        {!owner ? (
          <div
            key={s.id}
            className="ck-seller"
            style={{ transform: `translateX(${dx}px) rotate(${dx / 12}deg)`, opacity: 1 - Math.min(0.6, Math.abs(dx) / 300) }}
            onPointerDown={(e) => { if (!ready || sent) return; drag.current = { x0: e.clientX }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => drag.current && setDx(e.clientX - drag.current.x0)}
            onPointerUp={(e) => {
              const distance = drag.current ? e.clientX - drag.current.x0 : 0;
              drag.current = null;
              if (Math.abs(distance) > SWIPE_PX) choose(distance > 0);
              else setDx(0);
            }}
            onPointerCancel={() => { drag.current = null; setDx(0); }}
          >
            <img src={taskArt(task.taskId, s.kind)} alt="" draggable={false} />
            <b>{s.name}</b>
            <q>{s.line}</q>
          </div>
        ) : (
          <div className="ck-seller owner"
            style={{ transform: `translateX(${dx}px) rotate(${dx / 12}deg)` }}
            onPointerDown={(e) => { if (!ready || sent) return; drag.current = { x0: e.clientX }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => drag.current && setDx(e.clientX - drag.current.x0)}
            onPointerUp={(e) => { const distance = drag.current ? e.clientX - drag.current.x0 : 0; drag.current = null; if (Math.abs(distance) > SWIPE_PX) choose(distance > 0); else setDx(0); }}
            onPointerCancel={() => { drag.current = null; setDx(0); }}>
            <img src={taskArt(task.taskId, 'owner')} alt="" draggable={false} />
            <b>{task.owner.name}</b>
            <q>{task.owner.line}</q>
            <b className="ck-cash">{vnd(task.owner.debt)}</b>
          </div>
        )}
        <div className="ck-swipe-row ck-seller-actions">
          <button disabled={!ready || sent} onClick={() => choose(false)}>← {t('Dạ thôi!', 'No thanks!')}</button>
          <button disabled={!ready || sent} onClick={() => choose(true)}>{t('Trả tiền', 'Pay debt')} →</button>
        </div>
        <p className="ck-note">{!ready ? t('Đang nghe…', 'Listening…') : t('Vuốt thẻ hoặc chọn câu trả lời', 'Swipe the card or choose your reply')}</p>
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
