import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface BodyMapProps {
  selected: string;
  suggested?: string;
  onSelect: (site: string) => void;
  lastUsedSite?: string;
}

const SITES = [
  { id: 'abdomen', label: 'البطن', cx: 50, cy: 45, r: 10 },
  { id: 'thigh', label: 'الفخذ', cx: 38, cy: 72, r: 8 },
  { id: 'arm', label: 'الذراع', cx: 25, cy: 35, r: 7 },
  { id: 'glute', label: 'المؤخرة', cx: 62, cy: 55, r: 8 },
] as const;

const ROTATION_ORDER = ['abdomen', 'thigh', 'arm', 'glute'] as const;

function getNextRotationSite(lastSite: string | undefined): string {
  if (!lastSite) return ROTATION_ORDER[0];
  const idx = ROTATION_ORDER.indexOf(lastSite as typeof ROTATION_ORDER[number]);
  return ROTATION_ORDER[(idx + 1) % ROTATION_ORDER.length];
}

export default memo(function BodyMap({ selected, suggested: suggestedProp, onSelect, lastUsedSite }: BodyMapProps) {
  const suggested = useMemo(() => {
    if (suggestedProp) return suggestedProp;
    return getNextRotationSite(lastUsedSite);
  }, [suggestedProp, lastUsedSite]);
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 100 100" className="h-48 w-32" aria-label="مواقع الحقن">
        <line x1="50" y1="12" x2="50" y2="55" stroke="#d6d3d1" strokeWidth="2" />
        <line x1="50" y1="55" x2="35" y2="90" stroke="#d6d3d1" strokeWidth="2" />
        <line x1="50" y1="55" x2="65" y2="90" stroke="#d6d3d1" strokeWidth="2" />
        <line x1="50" y1="25" x2="22" y2="45" stroke="#d6d3d1" strokeWidth="2" />
        <line x1="50" y1="25" x2="78" y2="45" stroke="#d6d3d1" strokeWidth="2" />
        <circle cx="50" cy="8" r="6" fill="#e7e5e4" stroke="#d6d3d1" strokeWidth="1" />

        {SITES.map(site => (
          <g key={site.id}>
            <circle
              cx={site.cx}
              cy={site.cy}
              r={site.r}
              tabIndex={0}
              role="button"
              aria-label={site.label}
              className={cn(
                'cursor-pointer transition-all',
                selected === site.id
                  ? 'fill-emerald-500 stroke-emerald-700 stroke-2'
                  : suggested === site.id
                    ? 'fill-emerald-200 stroke-emerald-400 stroke-2 animate-pulse'
                    : 'fill-stone-200 stroke-stone-400 stroke-1 hover:fill-emerald-100'
              )}
              onClick={() => onSelect(site.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(site.id); } }}
            />
            {suggested === site.id && selected !== site.id && (
              <text x={site.cx} y={site.cy + 3} textAnchor="middle" className="fill-emerald-700 text-[6px] font-bold pointer-events-none">
                ←
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-2">
        {SITES.map(site => (
          <button
            key={site.id}
            onClick={() => onSelect(site.id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-bold transition-all',
              selected === site.id
                ? 'bg-emerald-600 text-white'
                : suggested === site.id
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            )}
          >
            {site.label}
            {suggested === site.id && selected !== site.id && ' (مقترح)'}
          </button>
        ))}
      </div>
    </div>
  );
});
