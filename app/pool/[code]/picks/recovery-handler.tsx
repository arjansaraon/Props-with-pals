'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spinner } from '@/app/components/spinner';

export function RecoveryHandler({ code }: { code: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const secret = searchParams.get('secret');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!secret) return;

    async function recover() {
      try {
        const res = await fetch(`/api/pools/${code}/recover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret }),
        });

        if (res.ok) {
          // Cookie is now set — redirect to clean URL
          router.replace(`/pool/${code}/picks`);
          router.refresh();
        } else {
          setError('Invalid recovery link. Please ask the captain for a new link.');
        }
      } catch {
        setError('Failed to restore session. Please try again.');
      }
    }

    recover();
  }, [secret, code, router]);

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
