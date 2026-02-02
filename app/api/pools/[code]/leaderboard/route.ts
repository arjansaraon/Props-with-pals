import { NextResponse } from 'next/server';
import { pools, participants } from '@/src/lib/schema';
import { eq, desc, asc } from 'drizzle-orm';
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
    const participantList = await database
      .select({
        id: participants.id,
        name: participants.name,
        totalPoints: participants.totalPoints,
      })
      .from(participants)
      .where(eq(participants.poolId, pool.id))
      .orderBy(desc(participants.totalPoints), asc(participants.name));

    // Add rank to each participant
    const leaderboard = participantList.map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

    return NextResponse.json(
      {
        poolId: pool.id,
        poolName: pool.name,
        poolStatus: pool.status,
        leaderboard,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting leaderboard:', error);
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
