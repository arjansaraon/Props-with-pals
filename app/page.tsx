'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveUserSession } from '@/src/lib/user-session';
import { Spinner } from '@/app/components/spinner';
import { InlineError } from '@/app/components/inline-error';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [buyInAmount, setBuyInAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          captainName,
          buyInAmount: buyInAmount || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create pool');
        return;
      }

      // Save user session to localStorage (cookie auth handles the secret)
      saveUserSession(data.inviteCode, { name: captainName, isCaptain: true });

      // Redirect to captain dashboard (cookie has the secret)
      router.push(`/pool/${data.inviteCode}/captain`);
    } catch (err) {
      setError('Failed to create pool. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <main className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-8">
          <h1 className="text-2xl font-bold text-center mb-2 text-zinc-900 dark:text-white">
            Props With Pals
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-center mb-8">
            Create a pool and start making prop bets with your friends
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Pool Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Super Bowl 2026"
                required
                maxLength={100}
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="captainName"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Your Name (Captain)
              </label>
              <input
                type="text"
                id="captainName"
                value={captainName}
                onChange={(e) => setCaptainName(e.target.value)}
                placeholder="e.g., John"
                required
                maxLength={50}
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="buyInAmount"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                Buy-in Amount (Optional)
              </label>
              <input
                type="text"
                id="buyInAmount"
                value={buyInAmount}
                onChange={(e) => setBuyInAmount(e.target.value)}
                placeholder="e.g., $20"
                maxLength={20}
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <InlineError message={error} onDismiss={() => setError('')} />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Spinner size="sm" />}
              {isLoading ? 'Creating...' : 'Create Pool'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Have an invite code?{' '}
              <a href="/join" className="text-blue-600 hover:underline">
                Join a pool
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
