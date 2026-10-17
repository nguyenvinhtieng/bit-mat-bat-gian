import { useT } from '../i18n';
import { toggleMic, toggleSpeaker, useVoice } from '../voice';

const Slash = () => <path d="M4 3 21 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />;

/** Mic + speaker toggles, top right next to the settings cog (lobby and in game). */
export function VoiceControls() {
  const t = useT();
  const { mic, micBusy, speaker } = useVoice();
  return (
    <div className="hud-voice">
      <button
        className={`voice-btn ${mic ? 'on' : 'off'}`}
        onClick={toggleMic}
        disabled={micBusy}
        title={mic ? t('micOff') : t('micOn')}
        aria-label={mic ? t('micOff') : t('micOn')}
        aria-pressed={mic}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
          <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {!mic && <Slash />}
        </svg>
      </button>
      <button
        className={`voice-btn ${speaker ? 'on' : 'off'}`}
        onClick={toggleSpeaker}
        title={speaker ? t('speakerOff') : t('speakerOn')}
        aria-label={speaker ? t('speakerOff') : t('speakerOn')}
        aria-pressed={speaker}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          {speaker ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <Slash />}
        </svg>
      </button>
    </div>
  );
}
