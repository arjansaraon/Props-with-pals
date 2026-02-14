import { NextRequest, NextResponse } from 'next/server';
import { pools, players, props, picks } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import { SubmitPickSchema } from '@/src/lib/validators';
import { getSecret, requireValidOrigin } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Submits a pick for a participant.
 * Requires participant secret for authorization.
 * Overwrites existing pick if one exists (upsert behavior).
 * Exported for testing with injected database.
 */
export async function submitPickHandler(
  request: Request,
  code: string,
  database: Database
): Promise<Response> {
  try {
    // Get secret from cookie (preferred) or query params (migration fallback)
    const secret = await getSecret(code, request);

    if (!secret) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Missing secret' },
        { status: 401 }
      );
    }

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

    // Check pool status - must be 'open' to submit picks
    if (pool.status !== 'open') {
      return NextResponse.json(
        { code: 'POOL_LOCKED', message: 'Cannot submit picks to locked or completed pool' },
        { status: 403 }
      );
    }

    // Find participant by secret
    const participantResult = await database
      .select()
      .from(players)
      .where(
        and(
          eq(players.poolId, pool.id),
          eq(players.secret, secret)
        )
      )
      .limit(1);

    if (participantResult.length === 0) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Invalid secret' },
        { status: 401 }
      );
    }

    const participant = participantResult[0];

    // Parse and validate request body
    const body = await request.json();
    const parseResult = SubmitPickSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { propId, selectedOptionIndex } = parseResult.data;

    // Find the prop and verify it belongs to this pool
    const propResult = await database
      .select()
      .from(props)
      .where(
        and(
          eq(props.id, propId),
          eq(props.poolId, pool.id)
        )
      )
      .limit(1);

    if (propResult.length === 0) {
      return NextResponse.json(
        { code: 'PROP_NOT_FOUND', message: 'Prop not found' },
        { status: 404 }
      );
    }

    const prop = propResult[0];

    // Validate option index is within range
    const options = prop.options as string[];
    if (selectedOptionIndex >= options.length) {
      return NextResponse.json(
        { code: 'INVALID_OPTION', message: 'Option index out of range' },
        { status: 400 }
      );
    }

    // Check if pick already exists
    const existingPick = await database
      .select()
      .from(picks)
      .where(
        and(
          eq(picks.playerId, participant.id),
          eq(picks.propId, propId)
        )
      )
      .limit(1);

    const now = new Date().toISOString();

    if (existingPick.length > 0) {
      // Update existing pick
      await database
        .update(picks)
        .set({
          selectedOptionIndex,
          updatedAt: now,
        })
        .where(eq(picks.id, existingPick[0].id));

      return NextResponse.json(
        {
          id: existingPick[0].id,
          playerId: participant.id,
          propId,
          selectedOptionIndex,
          updatedAt: now,
        },
        { status: 200 }
      );
    } else {
      // Create new pick
      const pickId = crypto.randomUUID();

      await database.insert(picks).values({
        id: pickId,
        playerId: participant.id,
        propId,
        selectedOptionIndex,
        pointsEarned: null,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json(
        {
          id: pickId,
          playerId: participant.id,
          propId,
          selectedOptionIndex,
          createdAt: now,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error submitting pick:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to submit pick' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[code]/picks
 * Submits a pick for a participant (requires participant secret)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  // CSRF protection
  const csrfError = requireValidOrigin(request);
  if (csrfError) return csrfError;

  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return submitPickHandler(request, code, db);
}
