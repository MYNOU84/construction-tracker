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
  const colorClass = color || getProgressColor(pct);

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{label}</span>
          <span className="font-medium">{Math.round(pct)}%</span>
        </div>
      )}
      <div className={cn('progress-bar', sizes[size])}>
        <div
          className={cn('progress-fill', colorClass, sizes[size])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
