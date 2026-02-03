import { db } from '@/src/lib/db';
import { pools, participants } from '@/src/lib/schema';
import { eq, desc, asc } from 'drizzle-orm';
import Link from 'next/link';

export default async function Leaderboard({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

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

  // Fetch participants ordered by points
  const leaderboard = await db
    .select({
      id: participants.id,
      name: participants.name,
      totalPoints: participants.totalPoints,
    })
    .from(participants)
    .where(eq(participants.poolId, pool.id))
    .orderBy(desc(participants.totalPoints), asc(participants.name));

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
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Leaderboard
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

          <Link
            href={`/pool/${code}`}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Back to pool
          </Link>
        </div>

        {/* Leaderboard */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-6">
              <p className="text-zinc-600 dark:text-zinc-400 text-center">
                No participants yet
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {leaderboard.map((participant, index) => {
                  const rank = index + 1;
                  const isWinner = pool.status === 'completed' && rank === 1;

                  return (
                    <tr
                      key={participant.id}
                      className={isWinner ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                    >
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${
                            rank === 1
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : rank === 2
                                ? 'text-zinc-400 dark:text-zinc-500'
                                : rank === 3
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {rank === 1 && '🥇 '}
                          {rank === 2 && '🥈 '}
                          {rank === 3 && '🥉 '}
                          {rank}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                          {participant.name}
                          {isWinner && (
                            <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                              Winner!
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {participant.totalPoints}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {pool.status === 'completed' && leaderboard.length > 0 && (
          <div className="mt-6 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
            <p className="text-green-800 dark:text-green-400">
              🎉 Pool completed! Congratulations to{' '}
              <strong>{leaderboard[0].name}</strong> for winning with{' '}
              {leaderboard[0].totalPoints} points!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
