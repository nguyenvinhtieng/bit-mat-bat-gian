import { useEffect } from 'react';
import { useLang } from '../i18n';
import { send } from '../net';
import { useStore } from '../store';
import { Modal, asset, useSkin } from './common';
import { Minigame } from './minigames';
import { QUOTES } from './minigames/registry';

const AUTO_CLOSE_MS = 2500;

export function TaskModal() {
  const task = useStore((s) => s.task);
  const result = useStore((s) => s.taskResult);
  const attempt = useStore((s) => s.taskAttempt);
  const me = useStore((s) => s.me);
  const room = useStore((s) => s.room);
  const set = useStore((s) => s.set);
  const lang = useLang((s) => s.lang);
  const skin = useSkin();
  const en = lang === 'en';
  const close = () => set({ task: null, taskResult: null });
  useEffect(() => {
    if (!result) return;
    const h = (e: KeyboardEvent) => e.key === 'Enter' && close();
    window.addEventListener('keydown', h);
    // Sài Gòn: the card gets out of the way by itself (no confirm click)
    const auto = window.setTimeout(close, AUTO_CLOSE_MS);
    return () => (window.removeEventListener('keydown', h), clearTimeout(auto));
  }, [!!result]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!task) return null;
  const st = skin.stations.find((x) => x.id === task.taskId)!;
  const submit = (answer: unknown) => send('task:submit', { taskId: task.taskId, answer });
  const title = en ? st.titleEn : st.title;

  if (result) {
    const quote = QUOTES[task.taskId];
    // shared crew prep progress (fake tasks never move it), shown as 10 pips
    const total = 10;
    const done = room ? Math.floor((room.progress / Math.max(1, room.progressTarget)) * total) : 0;
    return (
      <Modal title={en ? 'Task complete' : 'Hoàn thành nhiệm vụ'} onClose={close} wide className="hcard-modal">
        <div className="hcard" onClick={close}>
          <figure className="hcard-art">
            <img src={asset(`${skin.art.cards}/${skin.prefix}-${task.taskId}.webp`)} alt="" draggable={false} />
            <figcaption>{en ? skin.areas[st.area].nameEn : skin.areas[st.area].name}</figcaption>
            <span className="hcard-stamp" aria-hidden>
              <b>{en ? 'DONE' : 'ĐÃ XONG'}</b>
            </span>
            <i className="hcard-spark s1" />
            <i className="hcard-spark s2" />
            <i className="hcard-spark s3" />
          </figure>
          <div className="hcard-body">
            <span className="hcard-eyebrow">{skin.taskEyebrow ? (en ? skin.taskEyebrow.en : skin.taskEyebrow.vi) : en ? 'Last Ride prep' : 'Chuẩn bị Cuốc Cuối'}</span>
            <h2>{title}</h2>
            <p className="hcard-result">{result.text}</p>
            {quote && (
              <blockquote className="hcard-quote">
                <p>{en ? quote.en : quote.vi}</p>
                <cite>— {en ? quote.srcEn : quote.src}</cite>
              </blockquote>
            )}
            <div className="hcard-foot">
              <div className="hcard-progress">
                <span>{en ? 'Last Ride prep' : 'Chuẩn bị Cuốc Cuối'}</span>
                <div className="hcard-pips">
                  {Array.from({ length: total }, (_, i) => (
                    <i key={i} className={i < done ? 'on' : ''} />
                  ))}
                </div>
              </div>
              <button className="btn primary" onClick={close} autoFocus>
                {en ? 'Continue' : 'Tiếp tục'} <kbd>Enter</kbd>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={title} onClose={close} wide className="task-modal">
      <div className={`minigame mg-${task.taskId}`}>
        <div className="minigame-inner">
          <Minigame key={attempt} task={task} submit={submit} />
        </div>
      </div>
    </Modal>
  );
}
