import { NextRequest, NextResponse } from 'next/server';
import * as schema from '@/src/lib/schema';
import { players, pools } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { getSecret, safeCompareSecrets } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

// Export Database type for testing
export type Database = LibSQLDatabase<typeof schema>;

/**
 * Gets all participants in a pool (captain only).
 * Exported for testing with injected database.
 */
export async function getPlayersHandler(
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

    // Verify captain authorization (using timing-safe comparison)
    const secret = await getSecret(code, request);
    if (!secret || !safeCompareSecrets(secret, pool.captainSecret)) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Captain access required' },
        { status: 401 }
      );
    }

    // Fetch all participants for this pool
    // Note: We fetch secrets internally to determine captain status, but never expose them in the response
    const playersList = await database
      .select({
        id: players.id,
        name: players.name,
        secret: players.secret,
        totalPoints: players.totalPoints,
        joinedAt: players.joinedAt,
      })
      .from(players)
      .where(eq(players.poolId, pool.id))
      .orderBy(players.name);

    // Build recovery URLs so captain can share player-specific links
    const requestUrl = new URL(request.url);
    const origin = `${requestUrl.protocol}//${requestUrl.host}`;

    // Mark the captain in the list and include recovery URLs
    // Raw secrets are not exposed directly - they're embedded in recovery URLs
    const playersWithRole = playersList.map(({ secret, ...p }) => {
      const isCaptain = safeCompareSecrets(secret, pool.captainSecret);
      const recoveryPath = isCaptain
        ? `/pool/${code}/captain?secret=${secret}`
        : `/pool/${code}/picks?secret=${secret}`;
      return {
        ...p,
        isCaptain,
        recoveryUrl: `${origin}${recoveryPath}`,
      };
    });

    return NextResponse.json({ players: playersWithRole }, { status: 200 });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pools/[code]/players
 * Returns all participants in a pool (captain only)
 * Used for captain to recover/share participant links
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return getPlayersHandler(request, code, db);
}
