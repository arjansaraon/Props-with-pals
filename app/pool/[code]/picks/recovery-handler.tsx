'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spinner } from '@/app/components/spinner';

export function RecoveryHandler({ code, redirectPath }: { code: string; redirectPath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function recover() {
      try {
        const res = await fetch(`/api/pools/${code}/recover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          // Cookie is now set — redirect to clean URL
          router.replace(redirectPath || `/pool/${code}/picks`);
          router.refresh();
        } else {
          setError('Invalid recovery link. Please ask the captain for a new link.');
        }
      } catch {
        setError('Failed to restore session. Please try again.');
      }
    }

    recover();
  }, [token, code, router, redirectPath]);

  if (error) {
    return (
      <p className="text-center text-destructive py-4">{error}</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-8">
      <Spinner size="lg" className="text-primary" />
      <p className="text-muted-foreground">Restoring your session...</p>
    </div>
  );
}
