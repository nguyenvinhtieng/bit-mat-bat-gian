import { useLang, type Lang } from '../i18n';

const OPTIONS: { id: Lang; label: string; title: string }[] = [
  { id: 'vi', label: 'VI', title: 'Tiếng Việt' },
  { id: 'en', label: 'EN', title: 'English' },
];

/** Language selector shared by the home screen and settings. */
export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-switch ${className}`} role="radiogroup" aria-label="Language / Ngôn ngữ">
      <svg className="lang-globe saigon-ui-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6.5h14M5 17.5h14" /></svg>
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
