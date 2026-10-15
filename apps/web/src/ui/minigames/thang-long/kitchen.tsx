/** Bếp Tết + Đền Ngọc Sơn: bánh chưng, cây nêu, mâm ngũ quả. The server judges every answer. */
import { useEffect, useRef, useState } from 'react';
import type { TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, useDragDrop, useShake, type Submit } from '../common/kit';
import { FRUIT_ART, mg, useT } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

// ================================================================== Gói bánh chưng
const LAYER_ART: Record<string, string> = { la_dong: 'tl-mg-la-dong', gao: 'tl-mg-gao', dau_xanh: 'tl-mg-do', thit: 'tl-mg-thit' };
const LAYER_FILL: Record<string, string> = { la_dong: '#3f7a3a', gao: '#f1ead2', dau_xanh: '#e3c25a', thit: '#c9776a', banh_phong: '#f4d9b8', mut: '#f6f0e2' };
/** Guided recipe, bottom -> top (same order the server checks). Each step is a little riddle. */
const BC_STEPS = [
  { kind: 'la_dong', vi: 'Lót gì xuống đáy khuôn để bánh có màu xanh và thơm?', en: 'What lines the mould so the cake turns green and fragrant?', tip: ['Lá để gói, không phải để ăn.', 'A leaf for wrapping, not for eating.'] },
  { kind: 'gao', vi: 'Rải một lớp vỏ bánh trắng, dẻo, đã ngâm qua đêm.', en: 'Spread the white, sticky shell, soaked overnight.', tip: ['Thứ hạt trắng làm nên vỏ bánh.', 'The white grain that makes the shell.'] },
  { kind: 'dau_xanh', vi: 'Thêm một lớp nhân vàng, bùi bùi.', en: 'Add a layer of the yellow, nutty filling.', tip: ['Hạt nhỏ xanh, đồ chín thành màu vàng.', 'Small green beans that cook golden.'] },
  { kind: 'thit', vi: 'Giữa bánh là miếng nhân mặn, có nạc có mỡ.', en: 'In the middle goes the savoury piece, lean and fat.', tip: ['Miếng nhân mặn, ướp hạt tiêu.', 'The salty, peppered piece.'] },
  { kind: 'dau_xanh', vi: 'Phủ thêm một lớp nhân vàng lên trên.', en: 'Cover it with another yellow layer.', tip: ['Lại là nhân vàng như lớp trước.', 'The same yellow filling again.'] },
  { kind: 'gao', vi: 'Lấp kín mặt bánh bằng lớp vỏ trắng.', en: 'Seal the top with the white shell.', tip: ['Vỏ bánh bọc cả trên lẫn dưới.', 'The shell wraps top and bottom.'] },
];
/** where each tie sits on the wrapped cake: v = vertical at x%, h = horizontal at y% */
const TIES = [
  { d: 'v', at: 34 },
  { d: 'h', at: 34 },
  { d: 'v', at: 66 },
  { d: 'h', at: 66 },
] as const;
/** a green zone on the tension meter, somewhere new for each tie */
const newZone = () => ({ from: 18 + Math.random() * 50, size: 26 });

export function BanhChung({ task, submit }: { task: T<'task_banh_chung'>; submit: Submit }) {
  const t = useT();
  const [stack, setStack] = useState<string[]>([]);
  const [tied, setTied] = useState(0);
  const [phase, setPhase] = useState<'stack' | 'tie' | 'done'>('stack');
  const [wrong, setWrong] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [shake, doShake] = useShake();
  const [needle, setNeedle] = useState(0);
  const needleRef = useRef(0);
  const [zone, setZone] = useState(newZone);
  const steps = BC_STEPS.slice(0, task.slots);
  const step = steps[stack.length];
  const name = (k: string) => task.tray.find((x) => x.kind === k)?.name ?? k;
  const icon = (k: string) => (LAYER_ART[k] ? <img src={mg(LAYER_ART[k])} alt="" /> : <span className="tl-dot" style={{ background: LAYER_FILL[k] ?? '#ccc' }} />);

  // tension needle sweeps back and forth while tying
  useEffect(() => {
    if (phase !== 'tie') return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const v = 50 - 50 * Math.cos(((now - t0) / 1000) * 2.6);
      needleRef.current = v;
      setNeedle(v);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const pick = (kind: string) => {
    if (phase !== 'stack' || !step) return;
    if (kind !== step.kind) {
      sfx.bad();
      doShake();
      setWrong(kind);
      setMsg(t(`Chưa đúng — ${step.tip[0]}`, `Not that one — ${step.tip[1]}`));
      return;
    }
    sfx.scrape();
    setWrong(null);
    setMsg('');
    const next = [...stack, kind];
    setStack(next);
    if (next.length === steps.length) setTimeout(() => (sfx.ok(), setPhase('tie')), 650);
  };

  const pull = () => {
    if (phase !== 'tie') return;
    const v = needleRef.current;
    if (v < zone.from || v > zone.from + zone.size) {
      sfx.bad();
      doShake();
      setMsg(t('Lạt lỏng quá — bấm khi kim nằm trong vùng xanh.', 'Too loose — press while the needle is in the green.'));
      return;
    }
    sfx.stamp();
    setMsg('');
    const n = tied + 1;
    setTied(n);
    setZone(newZone());
    if (n === task.ties) {
      setPhase('done');
      setTimeout(() => submit({ layers: stack, ties: n }), 900);
    }
  };

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={phase === 'stack' ? `${stack.length}/${task.slots}` : `${t('lạt', 'ties')} ${tied}/${task.ties}`}
      tone={phase === 'done' ? 'ok' : msg ? 'bad' : 'info'}
      hint={
        phase === 'done'
          ? t('Bánh vuông vức, lạt buộc chặt — bắc nồi thôi!', 'Square and tied tight — into the pot!')
          : msg ||
            (phase === 'tie'
              ? t('Bấm “Siết!” khi kim nằm trong vùng xanh để buộc lạt.', 'Press “Pull!” when the needle is in the green to tie a string.')
              : t(`Lớp ${stack.length + 1}: ${step?.vi ?? ''}`, `Layer ${stack.length + 1}: ${step?.en ?? ''}`))
      }
    >
      <div className="tl-bc">
        <div className={`tl-bc-mould ${shake} ${phase !== 'stack' ? 'wrapped' : ''} ${phase === 'done' ? 'done' : ''}`} style={{ backgroundImage: `url(${mg('tl-mg-khuon')})` }}>
          <div className="tl-bc-stack">
            {steps.map((_, i) => {
              const k = stack[i];
              return (
                <div key={i} className={`tl-bc-layer ${k ? 'on' : ''} ${i === stack.length && phase === 'stack' ? 'next' : ''}`} style={k ? { background: LAYER_FILL[k] ?? '#ddd' } : undefined}>
                  {k ? (
                    <>
                      {icon(k)}
                      <span>{name(k)}</span>
                    </>
                  ) : (
                    <em>{i === stack.length ? '?' : ''}</em>
                  )}
                </div>
              );
            })}
          </div>
          {phase !== 'stack' && <div className="tl-bc-leaf" />}
          {TIES.slice(0, tied).map((p, i) => (
            <i key={i} className={`tl-bc-tie ${p.d}`} style={p.d === 'v' ? { left: `${p.at}%` } : { top: `${p.at}%` }} />
          ))}
        </div>
        {phase === 'stack' ? (
          <div className="tl-tray">
            {task.tray.map((it) => (
              <button key={it.kind} className={`tl-chip ${wrong === it.kind ? 'bad' : ''}`} onClick={() => pick(it.kind)}>
                {icon(it.kind)}
                <span>{it.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="tl-bc-tension">
            <div className="tl-bc-meter" aria-hidden>
              <span className="zone" style={{ left: `${zone.from}%`, width: `${zone.size}%` }} />
              <span className="needle" style={{ left: `${needle}%` }} />
            </div>
            <button className="btn primary tl-big" disabled={phase === 'done'} onPointerDown={pull}>
              {t('Siết!', 'Pull!')}
            </button>
          </div>
        )}
      </div>
    </MgShell>
  );
}

// ================================================================== Dựng cây nêu
export function CayNeu({ task, submit }: { task: T<'task_cay_neu'>; submit: Submit }) {
  const t = useT();
  const [sel, setSel] = useState<string[]>([]);
  const [phase, setPhase] = useState<'hang' | 'raise' | 'done'>('hang');
  const [tilt, setTilt] = useState(-28);
  const tiltRef = useRef(-28);
  const [shake, doShake] = useShake();
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (phase !== 'raise') return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const s = (now - t0) / 1000;
      // a sway that slows near upright, so a careful tap can catch it
      const v = 24 * Math.sin(s * 1.6) * (0.75 + 0.25 * Math.sin(s * 0.7));
      tiltRef.current = v;
      setTilt(v);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const toggle = (id: string) => {
    if (phase !== 'hang') return;
    sfx.scrape();
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < task.need ? [...s, id] : s));
  };
  const lock = () => {
    const v = Math.round(tiltRef.current * 10) / 10;
    if (Math.abs(v) <= task.maxTilt) {
      sfx.drum();
      setTilt(v);
      setPhase('done');
      setMsg('');
      setTimeout(() => submit({ ornaments: sel, tilt: v }), 1100);
    } else {
      sfx.bad();
      doShake();
      setMsg(t(`Nghiêng ${Math.abs(Math.round(v))}° — chờ cây gần thẳng đứng rồi chống.`, `Leaning ${Math.abs(Math.round(v))}° — wait until it is nearly upright.`));
    }
  };
  // all ornaments hung -> the pole rises by itself
  useEffect(() => {
    if (phase !== 'hang' || sel.length !== task.need) return;
    const id = setTimeout(() => setPhase('raise'), 600);
    return () => clearTimeout(id);
  }, [sel, phase, task.need]);
  const names = sel.map((id) => task.tray.find((x) => x.id === id)?.name ?? '');

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={phase === 'hang' ? `${sel.length}/${task.need}` : `${Math.round(tilt)}°`}
      tone={phase === 'done' ? 'ok' : msg ? 'bad' : 'info'}
      hint={
        phase === 'done'
          ? t('Cây nêu đã đứng thẳng, vòng vôi đã rắc!', 'The pole stands straight and the lime ring is drawn!')
          : msg ||
            (phase === 'hang'
              ? t(`Chọn ${task.need} thứ treo trên ngọn nêu theo tục xưa.`, `Pick the ${task.need} things tradition hangs on the pole.`)
              : t('Bấm “Chống” khi cây gần thẳng đứng.', 'Press “Brace” when the pole is nearly upright.'))
      }
    >
      <div className="tl-neu">
        <div className={`tl-neu-yard ${shake}`} style={{ backgroundImage: `url(${mg('tl-mg-dat-san')})` }}>
          <div className="tl-neu-pole" style={{ transform: `rotate(${phase === 'hang' ? -28 : tilt}deg)` }}>
            <div className="tl-neu-top" />
            <ul className="tl-neu-hung">
              {names.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
          {phase === 'done' && (
            <div className="tl-neu-lime">
              {Array.from({ length: 12 }, (_, i) => (
                <img key={i} src={mg('tl-mg-voi-dot')} alt="" style={{ transform: `rotate(${i * 30}deg) translateY(-46px)` }} />
              ))}
            </div>
          )}
        </div>
        {phase === 'hang' ? (
          <div className="tl-tray">
            {task.tray.map((o) => (
              <button key={o.id} className={`tl-chip ${sel.includes(o.id) ? 'sel' : ''}`} onClick={() => toggle(o.id)}>
                <span>
                  {o.name}
                  {o.desc && <small>{o.desc}</small>}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button className="btn primary tl-big" disabled={phase === 'done'} onClick={lock}>
            {t('Chống!', 'Brace!')}
          </button>
        )}
      </div>
    </MgShell>
  );
}

// ================================================================== Bày mâm ngũ quả
/** `tip` = which fruit the word sounds like / belongs there (easy mode) */
const NAM_SLOTS = [
  { key: 's0', vi: 'Cầu', en: '“Cầu” (pray)', tip: 'mãng cầu' },
  { key: 's1', vi: 'Sung', en: '“Sung” (plenty)', tip: 'sung' },
  { key: 's2', vi: 'Vừa', en: '“Vừa” (just)', tip: '~ dừa' },
  { key: 's3', vi: 'Đủ', en: '“Đủ” (enough)', tip: 'đu đủ' },
  { key: 's4', vi: 'Xài', en: '“Xài” (to spend)', tip: '~ xoài' },
];
const BAC_SLOTS = [
  { key: 'r0', vi: 'Xung quanh', en: 'Around', tip: 'quả khác' },
  { key: 'center', vi: 'Chính giữa', en: 'Centre', tip: 'bưởi / phật thủ' },
  { key: 'r1', vi: 'Xung quanh', en: 'Around', tip: 'quả khác' },
  { key: 'r2', vi: 'Xung quanh', en: 'Around', tip: 'quả khác' },
  { key: 'base', vi: 'Đỡ bên dưới', en: 'Base', tip: 'nải chuối' },
];

export function NguQua({ task, submit }: { task: T<'task_ngu_qua'>; submit: Submit }) {
  const t = useT();
  const slots = task.region === 'nam' ? NAM_SLOTS : BAC_SLOTS;
  const [put, setPut] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const used = new Set(Object.values(put));
  const full = slots.every((s) => put[s.key]);
  const place = (kind: string, key?: string) => {
    const target = key ?? slots.find((s) => !put[s.key])?.key;
    if (!target || sent) return;
    sfx.scrape();
    setPut((p) => {
      const n = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== kind));
      n[target] = kind;
      return n;
    });
  };
  const clear = (key: string) => !sent && setPut(({ [key]: _, ...rest }) => rest);
  const dnd = useDragDrop<string>((k, target) => place(k, target), (k) => place(k));
  const fruit = (kind: string) => {
    const f = task.fruits.find((x) => x.kind === kind);
    return FRUIT_ART[kind] ? <img src={mg(FRUIT_ART[kind])} alt={f?.name} /> : <span className="tl-fruit-fallback">{f?.name.slice(0, 1)}</span>;
  };
  const offer = () => {
    setSent(true);
    sfx.ok();
    const answer = task.region === 'nam' ? NAM_SLOTS.map((s) => put[s.key]) : { base: put.base, center: put.center, ring: [put.r0, put.r1, put.r2] };
    setTimeout(() => submit(answer), 500);
  };
  // tray full -> offer it straight away
  useEffect(() => {
    if (full && !sent) offer();
  }, [full]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Object.keys(put).length}/${task.slots}`}
      tone={sent ? 'ok' : 'info'}
      hint={
        sent
          ? t('Đã dâng mâm…', 'Offering the tray…')
          : task.region === 'nam'
            ? t('Mỗi ô là một chữ trong câu “cầu sung vừa đủ xài” — chọn quả có tên đọc giống chữ đó.', 'Each slot is a word of “cầu sung vừa đủ xài” — pick the fruit whose name sounds like it.')
            : t('Kéo quả vào ô. Chạm ô đã đặt để lấy ra.', 'Drag fruit onto the slots. Tap a filled slot to clear it.')
      }
    >
      <div className={`tl-nq ${dnd.dragging ? 'mg-dragging' : ''}`}>
        <div className={`tl-nq-tray ${task.region}`} style={{ backgroundImage: `url(${mg('tl-mg-mam')})` }}>
          {slots.map((s) => (
            <button key={s.key} className={`tl-nq-slot ${s.key} ${dnd.over === s.key ? 'drop-over' : ''}`} data-drop={s.key} onClick={() => clear(s.key)}>
              {put[s.key] ? (
                fruit(put[s.key])
              ) : (
                <em>
                  {t(s.vi, s.en)}
                  <small>{s.tip}</small>
                </em>
              )}
            </button>
          ))}
        </div>
        <div className="tl-tray">
          {task.fruits.map((f) => (
            <button key={f.kind} className={`tl-chip ${used.has(f.kind) ? 'used' : ''}`} {...dnd.source(f.kind, fruit(f.kind), sent)}>
              {fruit(f.kind)}
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      </div>
      {dnd.ghost}
    </MgShell>
  );
}
