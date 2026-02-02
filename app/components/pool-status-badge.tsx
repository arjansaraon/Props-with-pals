type PoolStatus = 'open' | 'locked' | 'completed';

interface PoolStatusBadgeProps {
  status: PoolStatus;
}

const statusStyles: Record<PoolStatus, string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  locked: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
};

export function PoolStatusBadge({ status }: PoolStatusBadgeProps) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
