import { NextResponse } from 'next/server';
import { pools, participants } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import { JoinPoolSchema } from '@/src/lib/validators';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Joins a pool as a new participant.
 * Exported for testing with injected database.
 */
export async function joinPoolHandler(
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

    // Check pool status - must be 'open' to join
    if (pool.status !== 'open') {
      return NextResponse.json(
        { code: 'POOL_LOCKED', message: 'Cannot join locked or completed pool' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = JoinPoolSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name } = parseResult.data;

    // Check if name is already taken in this pool
    const existingParticipant = await database
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.poolId, pool.id),
          eq(participants.name, name)
        )
      )
      .limit(1);

    if (existingParticipant.length > 0) {
      return NextResponse.json(
        { code: 'NAME_TAKEN', message: 'Name is already taken in this pool' },
        { status: 409 }
      );
    }

    // Create the participant
    const participantId = crypto.randomUUID();
    const participantSecret = crypto.randomUUID();
    const now = new Date().toISOString();

    await database.insert(participants).values({
      id: participantId,
      poolId: pool.id,
      name,
      secret: participantSecret,
      totalPoints: 0,
      paid: null,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        id: participantId,
        poolId: pool.id,
        name,
        secret: participantSecret,
        totalPoints: 0,
        status: 'active',
        joinedAt: now,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error joining pool:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to join pool' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[code]/join
 * Joins a pool as a new participant
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return joinPoolHandler(request, code, db);
}
