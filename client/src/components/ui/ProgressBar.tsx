import { cn, getProgressColor } from '../../utils/helpers';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizes = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

export default function ProgressBar({ value, max = 100, size = 'md', color, showLabel = false, label, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  // `color` may be a class (`bg-...`), an arbitrary class (`bg-[#hex]`) or a CSS colour value.
  const arbitrary = color?.match(/^bg-\[(.+)\]$/)?.[1];
  const isCssColor = !!color && !color.startsWith('bg-') && /^(#|rgb|hsl|var\()/.test(color);
  const fillColor = arbitrary || (isCssColor ? color : undefined);
  const colorClass = fillColor ? '' : (color || getProgressColor(pct));

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-2)' }}>
          <span>{label}</span>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--text-1)' }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div className={cn('progress-bar', sizes[size])} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={cn('progress-fill', colorClass, sizes[size])}
          style={{ width: `${pct}%`, ...(fillColor ? { background: fillColor } : {}) }}
        />
      </div>
    </div>
  );
}
