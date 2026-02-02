import { db } from '@/src/lib/db';
import { pools, props } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { CaptainClient } from './captain-client';

export default async function CaptainDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ secret?: string }>;
}) {
  const { code } = await params;
  const { secret } = await searchParams;

  // Fetch pool
  const poolResult = await db
    .select()
    .from(pools)
    .where(eq(pools.inviteCode, code))
    .limit(1);

  if (poolResult.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">Pool not found</p>
      </div>
    );
  }

  const pool = poolResult[0];

  // Verify captain secret
  if (!secret || pool.captainSecret !== secret) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Invalid captain secret. Please use the link you received when creating the pool.
          </p>
          <Link href="/" className="text-blue-600 hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  // Fetch props for this pool
  const propsList = await db
    .select()
    .from(props)
    .where(eq(props.poolId, pool.id))
    .orderBy(props.order);

  return (
    <div className="min-h-screen p-4">
      <main className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {pool.name}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Captain: {pool.captainName}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                pool.status === 'open'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : pool.status === 'locked'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
              }`}
            >
              {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
            </span>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              Invite Code
            </p>
            <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-white">
              {pool.inviteCode}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
              Share this code with friends to join
            </p>
          </div>

          {pool.buyInAmount && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Buy-in: {pool.buyInAmount}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/pool/${code}/leaderboard`}
              className="bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              View Leaderboard
            </Link>
            <Link
              href={`/pool/${code}/picks?secret=${secret}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Make Picks
            </Link>
          </div>
        </div>

        {/* Client component for interactive features */}
        <CaptainClient
          code={code}
          secret={secret}
          poolStatus={pool.status}
          propsList={propsList.map((p) => ({
            id: p.id,
            questionText: p.questionText,
            options: p.options as string[],
            pointValue: p.pointValue,
            correctOptionIndex: p.correctOptionIndex,
            status: p.status,
            order: p.order,
          }))}
        />

        {/* Instructions */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Captain Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
            <li>Share the invite code with friends to join</li>
            <li>Add props (questions) while the pool is open</li>
            <li>Lock the pool when everyone has joined and picks are in</li>
            <li>After the event, mark correct answers to calculate scores</li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              <strong>Important:</strong> Save this URL! You need it to manage your pool.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
