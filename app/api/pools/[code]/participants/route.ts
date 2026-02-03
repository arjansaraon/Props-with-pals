import { NextRequest, NextResponse } from 'next/server';
import { participants } from '@/src/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getPoolWithAuth, type Database } from '@/src/lib/api-helpers';

export type { Database };

/**
 * Gets all active participants for a pool.
 * Draft pools are only visible to the captain.
 * Returns participants sorted by totalPoints (descending).
 * Exported for testing with injected database.
 */
export async function getParticipantsHandler(
  request: NextRequest,
  code: string,
  database: Database
): Promise<Response> {
  try {
    // Get pool with auth check (draft pools hidden from non-captains)
    const result = await getPoolWithAuth(code, request, database);
    if (!result.success) {
      return result.response;
    }

    const { pool } = result;

    // Get all active participants, sorted by points descending
    const participantList = await database
      .select({
        id: participants.id,
        name: participants.name,
        totalPoints: participants.totalPoints,
        status: participants.status,
        joinedAt: participants.joinedAt,
      })
      .from(participants)
      .where(
        and(eq(participants.poolId, pool.id), eq(participants.status, 'active'))
      )
      .orderBy(desc(participants.totalPoints));

    return NextResponse.json(participantList, { status: 200 });
  } catch (error) {
    console.error('Error getting participants:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get participants' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pools/[code]/participants
 * Returns all active participants for a pool
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return getParticipantsHandler(request, code, db);
}
