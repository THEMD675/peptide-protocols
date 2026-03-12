import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SyringeOption {
  label: string;
  ml: number;
  units: number;
}

interface SyringeVisualProps {
  drawUnits: number;
  syringeOption: SyringeOption;
  compact?: boolean;
}

export default function SyringeVisual({
  drawUnits,
  syringeOption,
  compact = false,
}: SyringeVisualProps) {
  const gradientId = useId();
  const totalUnits = syringeOption.units;
  const clampedUnits = Math.min(Math.max(drawUnits, 0), totalUnits);
  const displayUnits = isFinite(clampedUnits) ? clampedUnits : 0;

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const tickColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
  const tickColorStrong = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
  const textColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const barrelFill = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const plungerColor = isDark ? '#7b8fa1' : '#4a5568';
  const plungerLightColor = isDark ? '#94a3b8' : '#718096';

  const barrelTop = 40;
  const barrelHeight = 240;
  const barrelWidth = 36;
  const barrelX = 22;

  const tickCount = totalUnits / (totalUnits <= 30 ? 5 : 10);
  const tickInterval = barrelHeight / tickCount;

  const fillRatio = displayUnits / totalUnits;
  const fillHeight = fillRatio * barrelHeight;
  const fillY = barrelTop + barrelHeight - fillHeight;

  const ticks: { y: number; label: string }[] = [];
  for (let i = 0; i <= tickCount; i++) {
    const unitVal = totalUnits <= 30 ? i * 5 : i * 10;
    ticks.push({
      y: barrelTop + barrelHeight - i * tickInterval,
      label: String(unitVal),
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className={cn('font-bold text-stone-900 dark:text-stone-100', compact ? 'text-xs' : 'text-sm')}>
        اسحب إلى: {displayUnits.toFixed(1)} وحدة
      </p>
      <svg
        viewBox="0 0 80 320"
        className={cn(
          'drop-shadow-lg',
          compact ? 'w-[60px] h-[240px]' : 'w-[80px] h-[320px] md:w-[100px] md:h-[400px]',
        )}
        role="img"
        aria-label={`سيرنج يُظهر ${displayUnits.toFixed(1)} وحدة`}
      >
        <rect x={barrelX + 8} y={4} width={20} height={8} rx={2} fill={plungerColor} />
        <rect x={barrelX + 14} y={12} width={8} height={barrelTop - 16} fill={plungerColor} />
        <rect x={barrelX + 6} y={barrelTop - 6} width={24} height={6} rx={1} fill={plungerLightColor} />

        <rect
          x={barrelX}
          y={barrelTop}
          width={barrelWidth}
          height={barrelHeight}
          rx={4}
          fill={barrelFill}
          stroke={tickColorStrong}
          strokeWidth={1.5}
        />

        {fillHeight > 0 && (
          <rect
            x={barrelX + 1.5}
            y={fillY}
            width={barrelWidth - 3}
            height={fillHeight}
            rx={fillY + fillHeight >= barrelTop + barrelHeight - 2 ? 3 : 0}
            fill={`url(#${gradientId})`}
            opacity={0.85}
            style={{ transition: 'y 0.5s ease-out, height 0.5s ease-out' }}
          />
        )}

        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={barrelX + barrelWidth + 2}
              y1={t.y}
              x2={barrelX + barrelWidth + (i % 2 === 0 ? 10 : 6)}
              y2={t.y}
              stroke={tickColor}
              strokeWidth={i % 2 === 0 ? 1 : 0.5}
            />
            {i % 2 === 0 && (
              <text
                x={barrelX + barrelWidth + 13}
                y={t.y + 3}
                fill={textColor}
                fontSize="10"
                fontFamily="Cairo, sans-serif"
              >
                {t.label}
              </text>
            )}
          </g>
        ))}

        {fillHeight > 0 && fillHeight < barrelHeight && (
          <>
            <line
              x1={barrelX - 4}
              y1={fillY}
              x2={barrelX + barrelWidth + 4}
              y2={fillY}
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="3,2"
              style={{ transition: 'y1 0.5s ease-out, y2 0.5s ease-out' }}
            />
            <circle cx={barrelX - 4} cy={fillY} r={2} fill="#10b981" style={{ transition: 'cy 0.5s ease-out' }} />
          </>
        )}

        <rect x={barrelX + 12} y={barrelTop + barrelHeight} width={12} height={8} rx={1} fill={plungerLightColor} />
        <line
          x1={barrelX + 18}
          y1={barrelTop + barrelHeight + 8}
          x2={barrelX + 18}
          y2={barrelTop + barrelHeight + 30}
          stroke={isDark ? '#94a3b8' : '#a0aec0'}
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
