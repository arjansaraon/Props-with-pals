import { NextResponse } from 'next/server';
import { pools, props, picks, participants } from '@/src/lib/schema';
import { eq, and, sum, isNull, inArray } from 'drizzle-orm';
import { ResolveSchema } from '@/src/lib/validators';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Resolves a prop by setting the correct answer.
 * Calculates points for all picks, updates participant totals,
 * and auto-completes the pool.
 * Exported for testing with injected database.
 */
export async function resolvePropHandler(
  request: Request,
  code: string,
  propId: string,
  database: Database
): Promise<Response> {
  try {
    // Get secret from query params
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');

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

    // Check authorization
    if (pool.captainSecret !== secret) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Invalid secret' },
        { status: 401 }
      );
    }

    // Check pool status - must be 'locked' to resolve
    if (pool.status === 'open') {
      return NextResponse.json(
        { code: 'POOL_NOT_LOCKED', message: 'Pool must be locked first' },
        { status: 403 }
      );
    }

    if (pool.status === 'completed') {
      return NextResponse.json(
        { code: 'POOL_LOCKED', message: 'Pool is already completed' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = ResolveSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { correctOptionIndex } = parseResult.data;

    // Find the prop
    const propResult = await database
      .select()
      .from(props)
      .where(and(eq(props.id, propId), eq(props.poolId, pool.id)))
      .limit(1);

    if (propResult.length === 0) {
      return NextResponse.json(
        { code: 'PROP_NOT_FOUND', message: 'Prop not found' },
        { status: 404 }
      );
    }

    const prop = propResult[0];

    // Check if already resolved
    if (prop.correctOptionIndex !== null) {
      return NextResponse.json(
        { code: 'ALREADY_RESOLVED', message: 'Prop has already been resolved' },
        { status: 400 }
      );
    }

    // Validate option index is within range
    const options = prop.options as string[];
    if (correctOptionIndex >= options.length) {
      return NextResponse.json(
        { code: 'INVALID_OPTION', message: 'Option index out of range' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Use transaction to ensure atomicity
    await database.transaction(async (tx) => {
      // 1. Update prop with correct answer
      await tx
        .update(props)
        .set({
          correctOptionIndex,
          updatedAt: now,
        })
        .where(eq(props.id, propId));

      // 2. Get all picks for this prop
      const allPicks = await tx
        .select()
        .from(picks)
        .where(eq(picks.propId, propId));

      // 3. Calculate and update points for each pick
      for (const pick of allPicks) {
        const pointsEarned =
          pick.selectedOptionIndex === correctOptionIndex ? prop.pointValue : 0;

        await tx
          .update(picks)
          .set({
            pointsEarned,
            updatedAt: now,
          })
          .where(eq(picks.id, pick.id));
      }

      // 4. Update participant totals (optimized: single query to get all totals)
      const affectedParticipantIds = [...new Set(allPicks.map((p) => p.participantId))];

      if (affectedParticipantIds.length > 0) {
        // Get all participant totals in one query instead of N queries
        const allTotals = await tx
          .select({
            participantId: picks.participantId,
            total: sum(picks.pointsEarned),
          })
          .from(picks)
          .where(inArray(picks.participantId, affectedParticipantIds))
          .groupBy(picks.participantId);

        // Update each participant with their new total
        for (const { participantId, total } of allTotals) {
          const totalPoints = Number(total) || 0;
          await tx
            .update(participants)
            .set({
              totalPoints,
              updatedAt: now,
            })
            .where(eq(participants.id, participantId));
        }
      }

      // 5. Check if all props are resolved (for auto-complete)
      const unresolvedProps = await tx
        .select()
        .from(props)
        .where(
          and(
            eq(props.poolId, pool.id),
            isNull(props.correctOptionIndex),
            eq(props.status, 'active')
          )
        );

      // 6. If all props resolved, complete the pool
      if (unresolvedProps.length === 0) {
        await tx
          .update(pools)
          .set({
            status: 'completed',
            updatedAt: now,
          })
          .where(eq(pools.id, pool.id));
      }
    });

    // Get updated data for response
    const updatedProp = await database
      .select()
      .from(props)
      .where(eq(props.id, propId))
      .limit(1);

    const updatedPool = await database
      .select()
      .from(pools)
      .where(eq(pools.id, pool.id))
      .limit(1);

    const picksWithPoints = await database
      .select({
        participantId: picks.participantId,
        pointsEarned: picks.pointsEarned,
      })
      .from(picks)
      .where(eq(picks.propId, propId));

    // Get participant names for response
    const participantNames = await database
      .select({
        id: participants.id,
        name: participants.name,
      })
      .from(participants)
      .where(eq(participants.poolId, pool.id));

    const nameMap = new Map(participantNames.map((p) => [p.id, p.name]));

    const pointsAwarded = picksWithPoints.map((p) => ({
      participantId: p.participantId,
      participantName: nameMap.get(p.participantId) || 'Unknown',
      pointsEarned: p.pointsEarned || 0,
    }));

    return NextResponse.json(
      {
        prop: {
          id: updatedProp[0].id,
          questionText: updatedProp[0].questionText,
          options: updatedProp[0].options,
          pointValue: updatedProp[0].pointValue,
          correctOptionIndex: updatedProp[0].correctOptionIndex,
          status: updatedProp[0].status,
        },
        pool: {
          status: updatedPool[0].status,
        },
        pointsAwarded,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resolving prop:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to resolve prop' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[code]/props/[id]/resolve
 * Resolves a prop by marking the correct answer (requires captain_secret)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string; id: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code, id } = await params;
  return resolvePropHandler(request, code, id, db);
}
