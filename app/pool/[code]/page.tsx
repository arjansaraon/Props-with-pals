'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { saveUserSession } from '@/src/lib/user-session';
import { Spinner } from '@/app/components/spinner';
import { InlineError } from '@/app/components/inline-error';

interface Pool {
  id: string;
  name: string;
  inviteCode: string;
  captainName: string;
  status: 'open' | 'locked' | 'completed';
  buyInAmount: string | null;
}

export default function JoinPool({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  const [pool, setPool] = useState<Pool | null>(null);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPool() {
      try {
        const response = await fetch(`/api/pools/${code}`);
        if (!response.ok) {
          setError('Pool not found');
          return;
        }
        const data = await response.json();
        setPool(data);
      } catch (err) {
        setError('Failed to load pool');
      } finally {
        setIsLoading(false);
      }
    }
    loadPool();
  }, [code]);

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsJoining(true);
    setError('');

    try {
      const response = await fetch(`/api/pools/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'NAME_TAKEN') {
          setError('That name is already taken. Please choose another.');
        } else if (data.code === 'POOL_LOCKED') {
          setError('This pool is no longer accepting new participants.');
        } else {
          setError(data.message || 'Failed to join pool');
        }
        return;
      }

      // Save user session to localStorage (cookie auth handles the secret)
      saveUserSession(code, { name, isCaptain: false });

      // Redirect to picks page (cookie has the secret)
      router.push(`/pool/${code}/picks`);
    } catch (err) {
      setError('Failed to join pool. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Pool Not Found</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            The pool with code &quot;{code}&quot; does not exist.
          </p>
          <a href="/" className="text-blue-600 hover:underline">
            Go back home
          </a>
        </div>
      </div>
    );
  }

  if (pool.status !== 'open') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
            {pool.name}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            This pool is {pool.status} and no longer accepting new participants.
          </p>
          <a
            href={`/pool/${code}/leaderboard`}
            className="text-blue-600 hover:underline"
          >
            View Leaderboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <main className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-center mb-2 text-zinc-900 dark:text-white">
            Join {pool.name}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-center mb-2">
            Hosted by {pool.captainName}
          </p>
          {pool.buyInAmount && (
            <p className="text-sm text-zinc-500 dark:text-zinc-500 text-center mb-6">
              Buy-in: {pool.buyInAmount}
            </p>
          )}

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                maxLength={50}
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <InlineError message={error} onDismiss={() => setError('')} />

            <button
              type="submit"
              disabled={isJoining}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isJoining && <Spinner size="sm" />}
              {isJoining ? 'Joining...' : 'Join Pool'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
