import { useLang, type Lang } from '../i18n';
import { asset } from './common';

const OPTIONS: { id: Lang; label: string; title: string }[] = [
  { id: 'vi', label: 'VI', title: 'Tiếng Việt' },
  { id: 'en', label: 'EN', title: 'English' },
];

/** Lacquer VI | EN switch with a sliding gold-rimmed knob (art: tools/ui-art/draw-home.mjs). */
export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-switch ${className}`} role="radiogroup" aria-label="Language / Ngôn ngữ">
      <img className="lang-globe" src={asset('maps/common/ui/home/globe.webp')} alt="" draggable={false} />
      <div className={`lang-track is-${lang}`}>
        <span className="lang-knob" aria-hidden />
        {OPTIONS.map((o) => (
          <button key={o.id} role="radio" aria-checked={lang === o.id} title={o.title} className={lang === o.id ? 'on' : ''} onClick={() => setLang(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
