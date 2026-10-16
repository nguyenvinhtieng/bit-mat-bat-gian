import { useEffect } from 'react';
import { useLang } from '../i18n';
import { send } from '../net';
import { useStore } from '../store';
import { Modal, asset, useSkin } from './common';
import { Minigame } from './minigames';
import { QUOTES } from './minigames/registry';

export function TaskModal() {
  const task = useStore((s) => s.task);
  const result = useStore((s) => s.taskResult);
  const attempt = useStore((s) => s.taskAttempt);
  const me = useStore((s) => s.me);
  const set = useStore((s) => s.set);
  const lang = useLang((s) => s.lang);
  const skin = useSkin();
  const en = lang === 'en';
  const close = () => set({ task: null, taskResult: null });
  useEffect(() => {
    if (!result) return;
    const h = (e: KeyboardEvent) => e.key === 'Enter' && close();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [!!result]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!task) return null;
  const st = skin.stations.find((x) => x.id === task.taskId)!;
  const submit = (answer: unknown) => send('task:submit', { taskId: task.taskId, answer });
  const title = en ? st.titleEn : st.title;

  if (result) {
    const quote = QUOTES[task.taskId];
    const done = me?.completedTasks.length ?? 0;
    const total = me?.tasks.length ?? 0;
    return (
      <Modal title={en ? 'Task complete' : 'Hoàn thành nhiệm vụ'} onClose={close} wide className="hcard-modal">
        <div className="hcard">
          <figure className="hcard-art">
            <img src={asset(`${skin.art.cards}/${skin.prefix}-card-${task.taskId}.webp`)} alt="" draggable={false} />
            <figcaption>{en ? skin.areas[st.area].nameEn : skin.areas[st.area].name}</figcaption>
            <span className="hcard-stamp" aria-hidden>
              <b>{en ? 'DONE' : 'ĐÃ XONG'}</b>
            </span>
            <i className="hcard-spark s1" />
            <i className="hcard-spark s2" />
            <i className="hcard-spark s3" />
          </figure>
          <div className="hcard-body">
            <span className="hcard-eyebrow">{en ? 'Ceremony preparations' : 'Chuẩn bị Lễ Ban Sóc'}</span>
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
                <span>{en ? 'Your tasks' : 'Nhiệm vụ của bạn'}</span>
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
