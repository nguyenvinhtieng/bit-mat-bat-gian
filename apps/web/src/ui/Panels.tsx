import { HUE_AREAS, HUE_INTRO, HUE_ROLE_STATIONS, ROLE_INFO } from '@hidden-truth/shared';
import { send } from '../net';
import { useStore } from '../store';
import { ClueCard, Modal, RoleBadge, asset } from './common';

export function AbilityModal() {
  const ability = useStore((s) => s.ability);
  const result = useStore((s) => s.abilityResult);
  const set = useStore((s) => s.set);
  if (!ability) return null;
  const close = () => set({ ability: null, abilityResult: null });
  return (
    <Modal title={ability.title} onClose={close} wide>
      <div className="ability">
        <RoleBadge role={ability.role} size={72} />
        <div>
          {result ? (
            <>
              {result.clue ? <ClueCard clue={result.clue} /> : <p>Không có kết quả.</p>}
              <button className="btn primary" onClick={close}>
                Đóng
              </button>
            </>
          ) : (
            <>
              <p>{ability.prompt}</p>
              <p className="muted small">Mỗi vòng chỉ dùng một lần. Kết quả là dữ kiện — không cho biết trực tiếp ai là thủ phạm.</p>
              <div className="option-grid">
                {ability.options?.map((o) => (
                  <button key={o.id} className="btn primary" onClick={() => send('ability:use', { option: o.id })}>
                    {o.label}
                  </button>
                ))}
                {!ability.options?.length && <p className="muted">Không còn lựa chọn khả dụng.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function Notebook() {
  const open = useStore((s) => s.notebookOpen);
  const me = useStore((s) => s.me);
  const set = useStore((s) => s.set);
  if (!open || !me) return null;
  return (
    <Modal title={`Sổ manh mối (${me.notebook.length})`} onClose={() => set({ notebookOpen: false })} wide>
      {me.notebook.length === 0 && <p className="muted">Chưa có manh mối. Làm nhiệm vụ chung và dùng năng lực role để thu thập.</p>}
      {me.extra?.map((x, i) => (
        <p className="secret-note" key={i}>
          🔒 {x}
        </p>
      ))}
      <div className="clue-grid">
        {me.notebook.map((c) => (
          <ClueCard key={c.id} clue={c} />
        ))}
      </div>
    </Modal>
  );
}

export function IntroModal() {
  const open = useStore((s) => s.introOpen);
  const me = useStore((s) => s.me);
  const set = useStore((s) => s.set);
  if (!open || !me) return null;
  const info = ROLE_INFO[me.role];
  const st = HUE_ROLE_STATIONS[me.role];
  return (
    <Modal title="Mật mã cố đô — Cố đô Huế" onClose={() => set({ introOpen: false })} wide>
      <div className="intro">
        <img className="intro-art" src={asset('maps/co-do-hue/meta/hue-lobby-thumb.webp')} alt="" />
        <blockquote>{HUE_INTRO}</blockquote>
        <div className={`role-reveal ${me.faction}`}>
          <RoleBadge role={me.role} size={96} />
          <div>
            <span className="faction">{me.faction === 'secret' ? 'Phe Bí Mật' : 'Phe Điều Tra'}</span>
            <h2>{info.name}</h2>
            <p>{info.desc}</p>
            <p>
              <b>Năng lực:</b> {info.ability} — tại <i>{st.title}</i> ({HUE_AREAS[st.area].name}).
            </p>
            <p className="objective">
              <b>Mục tiêu:</b> {me.objective}
            </p>
          </div>
        </div>
        <ul className="howto">
          <li>Đi giữa các phòng, làm 6 nhiệm vụ chung (vòng sáng vàng) để tăng tiến độ triển lãm và nhận manh mối.</li>
          <li>Dùng năng lực role một lần mỗi vòng tại điểm sáng xanh của bạn.</li>
          <li>Họp: chia sẻ manh mối lên bảng, tranh luận. Cuộc họp cuối: bỏ phiếu kết luận chuỗi sự việc.</li>
          <li>Thắng bằng bằng chứng: câu nào lệch, loại sai lệch, ai chịu trách nhiệm chính, khi nào — với ≥3 manh mối trên bảng.</li>
        </ul>
        <button className="btn primary big" onClick={() => set({ introOpen: false })}>
          Bắt đầu điều tra
        </button>
      </div>
    </Modal>
  );
}
