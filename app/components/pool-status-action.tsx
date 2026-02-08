'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Spinner } from '@/app/components/spinner';
import { Lock, Trophy } from 'lucide-react';

interface PoolStatusActionProps {
  code: string;
  initialStatus: 'open' | 'locked' | 'completed';
  onStatusChange?: (newStatus: string) => void;
}

export function PoolStatusAction({ code, initialStatus, onStatusChange }: PoolStatusActionProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const statusConfig = {
    open: { label: 'Open', variant: 'success' as const },
    locked: { label: 'Locked', variant: 'warning' as const },
    completed: { label: 'Completed', variant: 'info' as const },
  };

  const handleLock = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/pools/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'locked' }),
    });
    if (res.ok) {
      setStatus('locked');
      onStatusChange?.('locked');
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/pools/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    if (res.ok) {
      setStatus('completed');
      onStatusChange?.('completed');
      router.refresh();
    }
    setIsLoading(false);
  };

  const current = statusConfig[status];

  return (
    <div className="flex items-center gap-3">
      <Badge variant={current.variant}>{current.label}</Badge>
      {status === 'open' && (
        <Button onClick={handleLock} disabled={isLoading} size="sm" className="bg-amber-600 hover:bg-amber-700">
          {isLoading ? <Spinner size="sm" /> : <Lock className="h-4 w-4 mr-1" />}
          Lock Pool
        </Button>
      )}
      {status === 'locked' && (
        <Button onClick={handleComplete} disabled={isLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          {isLoading ? <Spinner size="sm" /> : <Trophy className="h-4 w-4 mr-1" />}
          Complete Pool
        </Button>
      )}
    </div>
  );
}
