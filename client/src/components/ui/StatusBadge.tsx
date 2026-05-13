import { getStatusColor, getStatusLabel } from '../../utils/helpers';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={getStatusColor(status)}>
      {label ?? getStatusLabel(status)}
    </span>
  );
}
