import { NextRequest, NextResponse } from 'next/server';
import { pools, players } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { JoinPoolSchema } from '@/src/lib/validators';
import { jsonResponseWithAuth } from '@/src/lib/auth';
import type { Database } from '@/src/lib/api-helpers';

export type { Database };

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

    // Create the participant (rely on unique constraint for duplicate detection)
    const playerId = crypto.randomUUID();
    const participantSecret = crypto.randomUUID();
    const now = new Date().toISOString();

    await database.insert(players).values({
      id: playerId,
      poolId: pool.id,
      name,
      secret: participantSecret,
      totalPoints: 0,
      paid: null,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    // Return participant with auth cookie set (secret is in httpOnly cookie, not response body)
    return jsonResponseWithAuth(
      {
        id: playerId,
        poolId: pool.id,
        name,
        totalPoints: 0,
        status: 'active',
        joinedAt: now,
      },
      code,
      participantSecret,
      201
    );
  } catch (error) {
    // Handle unique constraint violation (duplicate name in pool)
    // Drizzle wraps SQLite errors - check both error.message and error.cause
    const isUniqueConstraintError =
      error instanceof Error &&
      (error.message.includes('UNIQUE constraint failed') ||
        (error.cause instanceof Error &&
          error.cause.message.includes('UNIQUE constraint failed')));

    if (isUniqueConstraintError) {
      return NextResponse.json(
        { code: 'NAME_TAKEN', message: 'Name is already taken in this pool' },
        { status: 409 }
      );
    }

    console.error('Error joining pool:', error instanceof Error ? error.message : 'Unknown error');
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
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return joinPoolHandler(request, code, db);
}
