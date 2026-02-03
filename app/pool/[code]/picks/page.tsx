import { db } from '@/src/lib/db';
import { pools, props, picks, participants } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import Link from 'next/link';
import { PicksClient } from './picks-client';
import { getPoolSecret } from '@/src/lib/auth';

export default async function ParticipantPicks({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ secret?: string }>;
}) {
  const { code } = await params;
  const { secret: querySecret } = await searchParams;

  // Get secret from cookie (preferred) or query param (fallback for migration)
  const cookieSecret = await getPoolSecret(code);
  const secret = cookieSecret || querySecret;

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

  // Fetch props for this pool
  const propsList = await db
    .select()
    .from(props)
    .where(eq(props.poolId, pool.id))
    .orderBy(props.order);

  // Fetch participant by secret
  let participant = null;
  let myPicks: { propId: string; selectedOptionIndex: number }[] = [];

  if (secret) {
    const participantResult = await db
      .select()
      .from(participants)
      .where(and(eq(participants.poolId, pool.id), eq(participants.secret, secret)))
      .limit(1);

    if (participantResult.length > 0) {
      participant = participantResult[0];

      // Fetch this participant's picks
      const picksResult = await db
        .select()
        .from(picks)
        .where(eq(picks.participantId, participant.id));

      myPicks = picksResult.map((p) => ({
        propId: p.propId,
        selectedOptionIndex: p.selectedOptionIndex,
      }));
    }
  }

  return (
    <div className="min-h-screen p-4">
      <main className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {pool.name}
              </h1>
              {participant && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Playing as: {participant.name}
                </p>
              )}
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

          <Link
            href={`/pool/${code}/leaderboard`}
            className="text-blue-600 hover:underline text-sm"
          >
            View Leaderboard →
          </Link>
        </div>

        {pool.status !== 'open' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 p-4 rounded-lg mb-6">
            {pool.status === 'locked'
              ? 'This pool is locked. Picks can no longer be changed.'
              : 'This pool is completed. Check the leaderboard for results!'}
          </div>
        )}

        {!participant && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
            Invalid or missing participant secret. Please use the link you received when joining.
          </div>
        )}

        {/* Props list */}
        {propsList.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-4 sm:p-6">
            <p className="text-zinc-600 dark:text-zinc-400">
              No props have been added yet. Check back later!
            </p>
          </div>
        ) : (
          <PicksClient
            code={code}
            propsList={propsList.map((p) => ({
              id: p.id,
              questionText: p.questionText,
              options: p.options as string[],
              pointValue: p.pointValue,
              correctOptionIndex: p.correctOptionIndex,
            }))}
            initialPicks={myPicks}
            poolStatus={pool.status}
          />
        )}

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-400">
            <strong>Important:</strong> Save this URL! You need it to access your picks.
          </p>
        </div>
      </main>
    </div>
  );
}
