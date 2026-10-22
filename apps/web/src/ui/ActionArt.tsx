import { asset } from './common';

const cells: Record<string, number> = { task: 0, arrest: 1, inspect: 2, package: 3, report: 4, bell: 5, say: 6 };

/** One chibi atlas keeps all seven action buttons visually consistent. */
export function ActionArt({ name }: { name: string }) {
  if (name === 'bell') return <img className="action-art" src={asset('maps/common/ui/meeting-zola.svg')} alt="" aria-hidden="true" style={{ objectFit: 'contain' }} />;
  const cell = cells[name] ?? 0;
  return <span className="action-art" aria-hidden="true" style={{
    backgroundImage: `url("${asset('maps/common/ui/saigon/actions-chibi.webp')}")`,
    backgroundSize: '400% 200%',
    backgroundPosition: `${(cell % 4) * 100 / 3}% ${Math.floor(cell / 4) * 100}%`,
    backgroundRepeat: 'no-repeat',
  }} />;
}
