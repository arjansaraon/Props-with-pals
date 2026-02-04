import { NextRequest, NextResponse } from 'next/server';
import * as schema from '@/src/lib/schema';
import { participants, pools } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { getSecret } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

// Export Database type for testing
export type Database = LibSQLDatabase<typeof schema>;

/**
 * Gets all participants in a pool (captain only).
 * Exported for testing with injected database.
 */
export async function getParticipantsHandler(
  request: NextRequest,
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

    // Verify captain authorization
    const secret = await getSecret(code, request);
    if (!secret || secret !== pool.captainSecret) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Captain access required' },
        { status: 401 }
      );
    }

    // Fetch all participants for this pool
    const participantsList = await database
      .select({
        id: participants.id,
        name: participants.name,
        secret: participants.secret,
        totalPoints: participants.totalPoints,
        joinedAt: participants.joinedAt,
      })
      .from(participants)
      .where(eq(participants.poolId, pool.id))
      .orderBy(participants.name);

    // Mark the captain in the list
    const participantsWithRole = participantsList.map((p) => ({
      ...p,
      isCaptain: p.secret === pool.captainSecret,
    }));

    return NextResponse.json({ participants: participantsWithRole }, { status: 200 });
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pools/[code]/participants
 * Returns all participants in a pool (captain only)
 * Used for captain to recover/share participant links
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return getParticipantsHandler(request, code, db);
}
