import { ActionArt } from './ActionArt';
import { useEffect, useRef, useState } from 'react';
import { SAY_MAX } from '@hidden-truth/shared';
import { send } from '../net';
import { uiBlocksMovement, useStore } from '../store';
import { useT } from '../i18n';
import { tapProps, useEscape } from './common';
import { isTouchDevice } from './Joystick';

/** Round button in the action cluster that opens the speech-bubble composer. */
export function SayButton() {
  const t = useT();
  const set = useStore((s) => s.set);
  return (
    <button
      className="round-btn say-btn slot-say"
      {...tapProps(() => !uiBlocksMovement() && set({ sayOpen: true }))}
      title={`${t('say')} (Enter)`}
      aria-label={t('say')}
    >
      <ActionArt name="say" />
      <kbd>↵</kbd>
      <em>{t('say')}</em>
    </button>
  );
}

/**
 * Speech-bubble composer while exploring: Enter opens it, Enter sends, Esc closes.
 * Quick lines are one tap on phones (or 1–6 on an empty field) so nobody has to stop and type mid-chase.
 */
let sentAt = 0;

export function SayBox() {
  const t = useT();
  const open = useStore((s) => s.sayOpen);
  const set = useStore((s) => s.set);
  const [text, setText] = useState('');
  const [touch] = useState(isTouchDevice);
  const input = useRef<HTMLInputElement>(null);
  const quick = t('sayQuick').split('|');
  const close = () => {
    set({ sayOpen: false });
    setText('');
    // hand the keyboard straight back to the game: whatever held focus (field, chip, send) lets go
    (document.activeElement as HTMLElement | null)?.blur();
  };
  useEscape(close, open);

  useEffect(() => {
    if (open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || e.isComposing || e.keyCode === 229) return;
      // the Enter that just sent a line (or an IME commit trailing it) must not reopen the box
      if (Date.now() - sentAt < 400) return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) return;
      if (uiBlocksMovement()) return;
      // a mouse-clicked HUD button keeps focus: Enter must not re-press it
      if (ae?.tagName === 'BUTTON') ae.blur();
      e.preventDefault();
      set({ sayOpen: true });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, set]);

  // a phone keeps its keyboard down until the field is tapped: the quick lines are the fast path there
  useEffect(() => {
    if (open && !touch) input.current?.focus();
  }, [open, touch]);

  // leaving explore (meeting, arrest…) drops the composer
  useEffect(() => () => set({ sayOpen: false }), [set]);

  const say = (line: string) => {
    const v = line.trim();
    if (v) send('say', { text: v });
    sentAt = Date.now();
    close();
  };

  if (!open) return null;
  return (
    <div className="say-box" role="dialog" aria-label={t('say')}>
      <div className="say-quick">
        {quick.map((q, i) => (
          <button key={q} type="button" className="say-chip" {...tapProps(() => say(q))}>
            {!touch && <kbd>{i + 1}</kbd>}
            {q}
          </button>
        ))}
      </div>
      <div className="say-row">
        <span className="say-ico" aria-hidden="true">
          <ActionArt name="say" />
        </span>
        <input
          ref={input}
          aria-label={t('say')}
          value={text}
          maxLength={SAY_MAX}
          placeholder={t('sayPh')}
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // keep WASD / J / G … from reaching the game while typing
            e.stopPropagation();
            // 229: an IME (Telex/VNI) still owns this Enter — it commits the word, it does not send
            if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              say(text);
            } else if (!text && /^[1-9]$/.test(e.key) && quick[+e.key - 1]) {
              e.preventDefault();
              say(quick[+e.key - 1]);
            }
          }}
        />
        <span className="say-count">{SAY_MAX - text.length}</span>
        <button type="button" className="say-send" disabled={!text.trim()} {...tapProps(() => say(text))} aria-label={t('say')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.5 20 4l-6.5 16-2.5-6.5-7.5-2Z" /></svg>
        </button>
        <button type="button" className="say-x" {...tapProps(close)} aria-label={t('sayClose')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
        </button>
      </div>
    </div>
  );
}
