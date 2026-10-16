import { useState, type ReactNode } from 'react';
import { GAME, MEETING_POINT, SABOTAGE, areaAt, getGrid, type MapSkin } from '@hidden-truth/shared';
import { RoleBadge, asset } from './common';
import pins from './guides/hud-pins.json';

/** Real mobile HUD screenshots + measured pin spots: `node tools/smoke/guide-shots.mjs` regenerates both. */
type Shot = keyof typeof pins;
type Lang = 'vi' | 'en';
type Item = { id: string; icon: ReactNode; name: string; body: string; key?: string };

const MEETING_AREA = areaAt(getGrid(), MEETING_POINT.x, MEETING_POINT.y) ?? 'courtyard_checkin';
const ui = (n: string) => asset(`common/ui/${n}.webp`);
const Img = ({ src }: { src: string }) => <img src={src} alt="" draggable={false} />;
const Glyph = ({ c }: { c: string }) => <span className="gh-glyph">{c}</span>;

const TXT = {
  vi: { crew: 'Phe Dân', killer: (k: string) => `Phe ${k}`, goal: 'Mục tiêu', walk: 'Khi đi làm nhiệm vụ', atBell: 'Khi đứng ở bàn họp', noPin: 'Không có trên ảnh', same: 'Joystick, bản đồ, đồng hồ, sổ nhiệm vụ… giống hệt phe Dân.' },
  en: { crew: 'Villagers', killer: (k: string) => `${k}s`, goal: 'Goal', walk: 'While doing tasks', atBell: 'At the meeting table', noPin: 'Not shown above', same: 'Joystick, map, clock, task book… work exactly like the villagers’.' },
};

function items(skin: MapSkin, lang: Lang, touch: boolean) {
  const vi = lang === 'vi';
  const L = (o: { vi: string; en: string }) => o[lang];
  const k = L(skin.killerName);
  const seg = L(skin.labels.segment);
  const dl = L(skin.labels.deadline);
  const bell = L(skin.emergency);
  const area = vi ? skin.areas[MEETING_AREA].name : skin.areas[MEETING_AREA].nameEn;
  const { blind, ward } = skin.sabotage;
  const key = (s: string) => (touch ? undefined : s);
  const sabIcon = ward.icon ?? blind.icon;

  const it: Record<string, Item> = {
    joystick: {
      id: 'joystick',
      icon: <Img src={ui('mobile/joy-knob')} />,
      name: vi ? 'Joystick di chuyển' : 'Move joystick',
      body: vi ? 'Chạm và kéo ở nửa trái màn hình để đi — joystick hiện ra ngay chỗ bạn chạm.' : 'Touch and drag on the left half of the screen to walk — the joystick appears where you touch.',
      key: key('WASD / ←↑→↓'),
    },
    map: {
      id: 'map',
      icon: <Glyph c="🗺" />,
      name: vi ? 'Bản đồ nhỏ' : 'Minimap',
      body: vi ? 'Chấm vàng là bạn. Bấm để mở bản đồ lớn, xem các khu và chỗ làm nhiệm vụ.' : 'The yellow dot is you. Tap to open the big map with every area and task spot.',
      key: key('M'),
    },
    clock: {
      id: 'clock',
      icon: <Img src={asset(`${skin.art.clockIcon}.webp`)} />,
      name: vi ? `Đồng hồ ${seg}` : `${seg} clock`,
      body: vi
        ? `Đêm chia ${GAME.canhCount} ${seg}, đồng hồ đếm ngược ${seg} hiện tại và dừng khi họp. Tới ${dl} mà nhiệm vụ chưa xong thì ${k} thắng.`
        : `The night has ${GAME.canhCount} ${seg}s; the clock counts down the current one and pauses in meetings. If tasks are not done by ${dl}, the ${k}s win.`,
    },
    progress: {
      id: 'progress',
      icon: <Glyph c="📈" />,
      name: vi ? 'Tiến độ nhiệm vụ' : 'Task progress',
      body: vi ? 'Tổng nhiệm vụ cả đoàn đã làm (tính cả hồn ma). Đầy 100% là phe Dân thắng.' : 'Every task the crew has finished (ghosts included). At 100% the villagers win.',
    },
    counts: {
      id: 'counts',
      icon: <Img src={ui('count-crew')} />,
      name: vi ? 'Số người còn sống' : 'Players alive',
      body: vi ? `Số Dân và số ${k} còn sống. Khi số ${k} ≥ số Dân thì ${k} thắng.` : `Living villagers and ${k}s. Once ${k}s ≥ villagers, the ${k}s win.`,
    },
    role: {
      id: 'role',
      icon: <RoleBadge role="villager" size={36} />,
      name: vi ? 'Thẻ vai trò' : 'Role card',
      body: vi ? `Vai bí mật của bạn (${k} còn thấy tên đồng bọn). Bấm để xem lại mục tiêu và năng lực.` : `Your secret role (${k}s also see their partners). Tap to read your goal and ability again.`,
    },
    tasks: {
      id: 'tasks',
      icon: <Img src={ui('notebook')} />,
      name: vi ? 'Sổ nhiệm vụ' : 'Task book',
      body: vi ? 'Số nhiệm vụ đã xong / được giao. Bấm để xem danh sách và nhiệm vụ nằm ở khu nào.' : 'Tasks done / assigned. Tap to see the list and which area each one is in.',
      key: key('T'),
    },
    report: {
      id: 'report',
      icon: <Img src={ui('btn-report')} />,
      name: vi ? 'Báo cáo' : 'Report',
      body: vi
        ? `Sáng lên khi bạn đứng gần một thi thể. Bấm để gọi họp ngay: mọi người về bàn họp, trò chuyện và bỏ phiếu (~${GAME.meetingSec}s).`
        : `Lights up next to a body. Tap to call a meeting at once: everyone gathers, chats and votes (~${GAME.meetingSec}s).`,
      key: key('L'),
    },
    task: {
      id: 'task',
      icon: <Img src={ui('btn-task')} />,
      name: vi ? 'Làm nhiệm vụ' : 'Do task',
      body: vi
        ? 'Sáng lên khi bạn đứng trong vòng sáng vàng của điểm nhiệm vụ. Bấm để mở mini-game, làm đúng là tiến độ tăng. Nút xám = chưa đứng đúng chỗ.'
        : 'Lights up inside a task spot’s golden ring. Tap to open the mini-game; solve it to fill the progress bar. Grey = not at a task spot.',
      key: key('J / Space'),
    },
    bell: {
      id: 'bell',
      icon: <Img src={ui('btn-bell')} />,
      name: bell,
      body: vi
        ? `Chỉ hiện khi bạn đứng ở bàn họp (${area}). Bấm để gọi họp khẩn khi nghi ai đó. Mỗi người được ${GAME.emergencyPerPlayer} lần, dùng rồi nút sẽ xám.`
        : `Only shows at the meeting table (${area}). Tap to call an emergency meeting when you suspect someone. ${GAME.emergencyPerPlayer} use per player; it greys out afterwards.`,
      key: key('J'),
    },
    fix: {
      id: 'fix',
      icon: ward.icon ? <Img src={asset(`${ward.icon}.webp`)} /> : <Glyph c="⛩" />,
      name: vi ? `Sửa “${L(ward.name)}”` : `Fix “${L(ward.name)}”`,
      body: vi
        ? `Khi ${k} phá ${L(ward.name)}, tới đúng chỗ sẽ hiện nút “${L(ward.fix)}”. Giữ nút ~${SABOTAGE.fixHoldSec}s để sửa; sau ${SABOTAGE.wardSec}s chưa ai sửa thì ${k} thắng.`
        : `When the ${k}s sabotage ${L(ward.name)}, a “${L(ward.fix)}” button appears at its spot. Hold it ~${SABOTAGE.fixHoldSec}s to fix; unfixed after ${SABOTAGE.wardSec}s, the ${k}s win.`,
      key: key(vi ? 'giữ J' : 'hold J'),
    },
    kill: {
      id: 'kill',
      icon: <Img src={ui('btn-kill')} />,
      name: vi ? 'Hạ gục' : 'Kill',
      body: vi
        ? `Sáng đỏ khi có người (không phải đồng bọn) trong tầm. Bấm để hạ gục, rồi chờ hồi ${GAME.killCooldownSec}s (vòng đếm quanh nút). Nạn nhân để lại thi thể.`
        : `Glows red when a non-partner is in range. Tap to kill, then wait the ${GAME.killCooldownSec}s cooldown (ring around the button). The victim leaves a body.`,
      key: key('K'),
    },
    sabotage: {
      id: 'sabotage',
      icon: sabIcon ? <Img src={asset(`${sabIcon}.webp`)} /> : <Glyph c="💥" />,
      name: vi ? 'Phá hoại' : 'Sabotage',
      body: vi
        ? `Bấm để chọn: ${L(blind.name)} — người sống gần như mù ${SABOTAGE.blindSec}s; hoặc ${L(ward.name)} — Dân phải sửa trong ${SABOTAGE.wardSec}s. Hồi ${SABOTAGE.cooldownSec}s, dùng chung với đồng bọn.`
        : `Tap to pick: ${L(blind.name)} — the living are nearly blind for ${SABOTAGE.blindSec}s; or ${L(ward.name)} — villagers must fix it within ${SABOTAGE.wardSec}s. ${SABOTAGE.cooldownSec}s cooldown, shared with partners.`,
      key: key('I'),
    },
    fakeTask: {
      id: 'task',
      icon: <Img src={ui('btn-task')} />,
      name: vi ? 'Nhiệm vụ giả' : 'Fake task',
      body: vi
        ? 'Nút nhỏ, chỉ hiện khi bạn đứng ở điểm nhiệm vụ. Mở mini-game để giả vờ làm — không cộng tiến độ nhưng giúp bạn khỏi bị nghi.'
        : 'A small button that only shows at a task spot. Play along to look busy — it adds no progress but keeps suspicion off you.',
      key: key('J'),
    },
    killerReport: {
      id: 'report',
      icon: <Img src={ui('btn-report')} />,
      name: vi ? 'Báo cáo' : 'Report',
      body: vi ? 'Bạn cũng báo cáo được — tự báo thi thể mình vừa hạ để đánh lạc hướng.' : 'You can report too — reporting your own kill is a classic way to throw people off.',
      key: key('L'),
    },
  };

  const goal = {
    crew: vi ? `Làm xong mọi nhiệm vụ trước ${dl}, hoặc bỏ phiếu loại hết ${k}.` : `Finish every task before ${dl}, or vote out every ${k}.`,
    killer: vi ? `Hạ gục cho tới khi số ${k} ≥ số Dân còn sống, hoặc cầm chân tới ${dl} khi nhiệm vụ chưa xong.` : `Kill until ${k}s ≥ living villagers, or stall until ${dl} with tasks unfinished.`,
  };
  const sections = {
    crew: [
      { shot: 'crew' as Shot, label: TXT[lang].walk, list: [it.joystick, it.map, it.clock, it.progress, it.counts, it.role, it.tasks, it.report, it.task] },
      { shot: 'bell' as Shot, label: TXT[lang].atBell, list: [it.bell] },
    ],
    killer: [{ shot: 'killer' as Shot, label: TXT[lang].walk, list: [it.kill, it.sabotage, it.fakeTask, it.killerReport] }],
  };
  return { goal, sections, extra: { crew: [it.fix], killer: [] as Item[] }, k };
}

function HudShot({ shot, list, start }: { shot: Shot; list: Item[]; start: number }) {
  const at: Record<string, number[] | undefined> = pins[shot];
  return (
    <div className="gh-shot">
      <img src={asset(`common/ui/guide/hud-${shot}.webp`)} alt="" draggable={false} />
      {list.map((x, i) =>
        at[x.id] ? (
          <i key={x.name} className="gh-pin" style={{ left: `${at[x.id]![0]}%`, top: `${at[x.id]![1]}%` }}>
            {start + i}
          </i>
        ) : null,
      )}
    </div>
  );
}

function Legend({ list, start }: { list: Item[]; start?: number }) {
  return (
    <ul className="gh-legend">
      {list.map((x, i) => (
        <li key={x.name}>
          <span className="gh-icon">
            {x.icon}
            {start !== undefined && <i className="gh-pin">{start + i}</i>}
          </span>
          <div>
            <strong>
              {x.name}
              {x.key && <kbd>{x.key}</kbd>}
            </strong>
            <span>{x.body}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** "How to play" tab: pick a side, then every HUD button pinned on a real screenshot + explained. */
export function GuideHud({ skin, lang, touch }: { skin: MapSkin; lang: Lang; touch: boolean }) {
  const [side, setSide] = useState<'crew' | 'killer'>('crew');
  const { goal, sections, extra, k } = items(skin, lang, touch);
  const tx = TXT[lang];
  return (
    <>
      <div className="gh-sides" role="tablist">
        {(['crew', 'killer'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={side === s} className={`gh-side ${s} ${side === s ? 'active' : ''}`} onClick={() => setSide(s)}>
            <img src={asset(`common/ui/count-${s}.webp`)} alt="" draggable={false} />
            {s === 'crew' ? tx.crew : tx.killer(k)}
          </button>
        ))}
      </div>
      <p className="gh-goal">
        <b>{tx.goal}:</b> {goal[side]}
      </p>
      {sections[side].map((sec) => (
        <section key={sec.shot}>
          <h4>{sec.label}</h4>
          <HudShot shot={sec.shot} list={sec.list} start={1} />
          <Legend list={sec.list} start={1} />
        </section>
      ))}
      {extra[side].length > 0 && (
        <>
          <h4>{tx.noPin}</h4>
          <Legend list={extra[side]} />
        </>
      )}
      {side === 'killer' && <p className="muted small">{tx.same}</p>}
    </>
  );
}
