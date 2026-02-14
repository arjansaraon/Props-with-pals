import { NextResponse } from 'next/server';
import { pools, players, props } from '@/src/lib/schema';
import { eq, desc, asc, isNotNull, and } from 'drizzle-orm';
import { safeCompareSecrets } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Gets the leaderboard for a pool.
 * Returns participants ranked by total_points DESC, then name ASC (tie-breaker).
 * Exported for testing with injected database.
 */
export async function getLeaderboardHandler(
  request: Request,
  code: string,
  database: Database
): Promise<Response> {
  try {
    // Find pool by invite code
    const poolResult = await database
      .select()
      .from(pools)
      .where(eq(pools.inviteCode, code))
      .limit(1);

    if (poolResult.length === 0) {
      return NextResponse.json(
        { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
        { status: 404 }
      );
    }

    const pool = poolResult[0];

    // Get all participants for this pool, ordered by points DESC, name ASC
    // Include secret to determine if player is captain
    const participantList = await database
      .select({
        id: players.id,
        name: players.name,
        totalPoints: players.totalPoints,
        secret: players.secret,
      })
      .from(players)
      .where(eq(players.poolId, pool.id))
      .orderBy(desc(players.totalPoints), asc(players.name));

    // Check if any props have been resolved
    const resolvedPropsResult = await database
      .select({ id: props.id })
      .from(props)
      .where(and(eq(props.poolId, pool.id), isNotNull(props.correctOptionIndex)))
      .limit(1);

    const hasResolvedProps = resolvedPropsResult.length > 0;

    // Add rank and isCaptain to each participant (don't expose secret)
    const leaderboard = participantList.map((p, index) => ({
      id: p.id,
      name: p.name,
      totalPoints: p.totalPoints,
      rank: index + 1,
      isCaptain: safeCompareSecrets(p.secret, pool.captainSecret),
    }));

    return NextResponse.json(
      {
        poolId: pool.id,
        poolName: pool.name,
        poolStatus: pool.status,
        hasResolvedProps,
        leaderboard,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting leaderboard:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pools/[code]/leaderboard
 * Returns the leaderboard for a pool
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return getLeaderboardHandler(request, code, db);
}
