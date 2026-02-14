import { NextRequest, NextResponse } from 'next/server';
import { props, picks, players } from '@/src/lib/schema';
import { eq, and, sum } from 'drizzle-orm';
import { UpdatePropSchema } from '@/src/lib/validators';
import {
  getPoolWithAuth,
  poolStatusErrors,
  type Database,
} from '@/src/lib/api-helpers';

export type { Database };

/**
 * Updates a prop.
 * - In open: Can edit all fields (questionText, options, pointValue, category)
 * - In locked/completed: Cannot edit
 * Exported for testing with injected database.
 */
export async function updatePropHandler(
  request: Request,
  code: string,
  propId: string,
  database: Database
): Promise<Response> {
  try {
    // Get pool with captain auth check
    const result = await getPoolWithAuth(code, request, database, {
      requireCaptain: true,
    });
    if (!result.success) {
      return result.response;
    }

    const { pool } = result;

    // Check pool status
    if (pool.status === 'locked' || pool.status === 'completed') {
      return poolStatusErrors.cannotEditAfterLocked();
    }

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

    // Parse and validate request body
    const body = await request.json();
    const parseResult = UpdatePropSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { questionText, options, pointValue, category } = parseResult.data;
    const now = new Date().toISOString();

    // In open: can edit everything
    const updates: Partial<typeof props.$inferInsert> = { updatedAt: now };

    if (questionText !== undefined) {
      updates.questionText = questionText.trim();
    }
    if (options !== undefined) {
      updates.options = options;
    }
    if (pointValue !== undefined) {
      updates.pointValue = pointValue;
    }
    if (category !== undefined) {
      updates.category = category || null;
    }

    await database.update(props).set(updates).where(eq(props.id, propId));

    // Fetch updated prop
    const updatedProp = await database
      .select()
      .from(props)
      .where(eq(props.id, propId))
      .limit(1);

    return NextResponse.json(updatedProp[0], { status: 200 });
  } catch (error) {
    console.error('Error updating prop:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update prop' },
      { status: 500 }
    );
  }
}

/**
 * Deletes a prop (hard delete).
 * Only allowed when pool is in open status.
 * Exported for testing with injected database.
 */
export async function deletePropHandler(
  request: Request,
  code: string,
  propId: string,
  database: Database
): Promise<Response> {
  try {
    // Get pool with captain auth check
    const result = await getPoolWithAuth(code, request, database, {
      requireCaptain: true,
    });
    if (!result.success) {
      return result.response;
    }

    const { pool } = result;

    // Check pool status - can only delete in open
    if (pool.status !== 'open') {
      return poolStatusErrors.cannotDeleteAfterLocked();
    }

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

    // Delete the prop
    await database.delete(props).where(eq(props.id, propId));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting prop:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to delete prop' },
      { status: 500 }
    );
  }
}

/**
 * Voids a prop. Sets status to 'voided', zeros out all pick points,
 * and recalculates player totals. Allowed when pool is locked.
 * Exported for testing with injected database.
 */
export async function voidPropHandler(
  request: Request,
  code: string,
  propId: string,
  database: Database
): Promise<Response> {
  try {
    const result = await getPoolWithAuth(code, request, database, {
      requireCaptain: true,
    });
    if (!result.success) return result.response;

    const { pool } = result;

    if (pool.status !== 'locked') {
      return NextResponse.json(
        { code: 'POOL_NOT_LOCKED', message: 'Can only void props when pool is locked' },
        { status: 403 }
      );
    }

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

    if (propResult[0].status === 'voided') {
      return NextResponse.json(
        { code: 'ALREADY_VOIDED', message: 'Prop is already voided' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    await database.transaction(async (tx) => {
      // 1. Mark prop as voided and clear correct answer
      await tx.update(props).set({
        status: 'voided',
        correctOptionIndex: null,
        updatedAt: now,
      }).where(eq(props.id, propId));

      // 2. Zero out all pick points for this prop
      await tx.update(picks).set({
        pointsEarned: 0,
        updatedAt: now,
      }).where(eq(picks.propId, propId));

      // 3. Recalculate totals for affected players
      const affectedPicks = await tx
        .select({ playerId: picks.playerId })
        .from(picks)
        .where(eq(picks.propId, propId));

      const playerIds = [...new Set(affectedPicks.map((p) => p.playerId))];

      for (const playerId of playerIds) {
        const totalResult = await tx
          .select({ total: sum(picks.pointsEarned) })
          .from(picks)
          .where(eq(picks.playerId, playerId));

        await tx.update(players).set({
          totalPoints: Number(totalResult[0]?.total ?? 0),
          updatedAt: now,
        }).where(eq(players.id, playerId));
      }
    });

    const updatedProp = await database
      .select()
      .from(props)
      .where(eq(props.id, propId))
      .limit(1);

    return NextResponse.json({ prop: updatedProp[0], pool: { status: pool.status } }, { status: 200 });
  } catch (error) {
    console.error('Error voiding prop:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to void prop' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pools/[code]/props/[id]
 * Updates a prop (captain only, edit restrictions based on pool status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code, id } = await params;
  return updatePropHandler(request, code, id, db);
}

/**
 * DELETE /api/pools/[code]/props/[id]
 * Deletes a prop (captain only, open status only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code, id } = await params;
  return deletePropHandler(request, code, id, db);
}

/**
 * POST /api/pools/[code]/props/[id]
 * Voids a prop (captain only, locked status only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code, id } = await params;
  return voidPropHandler(request, code, id, db);
}
