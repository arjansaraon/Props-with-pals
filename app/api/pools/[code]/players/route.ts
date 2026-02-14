import { NextRequest, NextResponse } from 'next/server';
import { players } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { safeCompareSecrets } from '@/src/lib/auth';
import { getOrCreateTokensForPool } from '@/src/lib/recovery-tokens';
import { getPoolWithAuth } from '@/src/lib/api-helpers';
import type { Database } from '@/src/lib/api-helpers';

export type { Database };

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
    const authResult = await getPoolWithAuth(code, request, database, { requireCaptain: true });
    if (!authResult.success) return authResult.response;
    const { pool } = authResult;

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

    // Build recovery URLs with opaque tokens (secrets never leave the server)
    const requestUrl = new URL(request.url);
    const origin = `${requestUrl.protocol}//${requestUrl.host}`;

    // Generate or reuse recovery tokens for all players
    const playerIds = playersList.map((p) => p.id);
    const tokenMap = await getOrCreateTokensForPool(database, pool.id, playerIds);

    const playersWithRole = playersList.map(({ secret, ...p }) => {
      const isCaptain = safeCompareSecrets(secret, pool.captainSecret);
      const tokenStr = tokenMap.get(p.id)!;
      const recoveryPath = isCaptain
        ? `/pool/${code}/captain?token=${tokenStr}`
        : `/pool/${code}/picks?token=${tokenStr}`;
      return {
        ...p,
        isCaptain,
        recoveryUrl: `${origin}${recoveryPath}`,
      };
    });

    return NextResponse.json({ players: playersWithRole }, { status: 200 });
  } catch (error) {
    console.error('Error fetching participants:', error instanceof Error ? error.message : 'Unknown error');
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
