import { NextRequest, NextResponse } from 'next/server';
import { pools } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { requireValidOrigin } from '@/src/lib/auth';
import { UpdatePoolSchema } from '@/src/lib/validators';
import {
  getPoolWithAuth,
  toPublicPool,
  type Database,
} from '@/src/lib/api-helpers';

export type { Database };

/**
 * Gets a pool by invite code.
 * Exported for testing with injected database.
 */
export async function getPoolHandler(
  request: NextRequest,
  code: string,
  database: Database
): Promise<Response> {
  try {
    // Get pool with auth check
    const result = await getPoolWithAuth(code, request, database);
    if (!result.success) {
      return result.response;
    }

    return NextResponse.json(toPublicPool(result.pool), { status: 200 });
  } catch (error) {
    console.error('Error getting pool:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get pool' },
      { status: 500 }
    );
  }
}

/**
 * Updates pool details (name, description) or status transitions.
 * Requires captain_secret for authorization.
 * - name/description: Can edit in open status
 * - status transitions: open→locked, locked→completed
 * Exported for testing with injected database.
 */
export async function updatePoolHandler(
  request: NextRequest,
  code: string,
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

    // Parse and validate request body
    const body = await request.json();
    const parseResult = UpdatePoolSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, status: targetStatus } = parseResult.data;
    const now = new Date().toISOString();

    // Handle locked → completed transition (captain manually completes pool)
    if (targetStatus === 'completed' && pool.status === 'locked') {
      await database
        .update(pools)
        .set({ status: 'completed', updatedAt: now })
        .where(eq(pools.id, pool.id));

      return NextResponse.json(
        { ...toPublicPool(pool), status: 'completed', updatedAt: now },
        { status: 200 }
      );
    }

    // Reject completing from non-locked status
    if (targetStatus === 'completed' && pool.status !== 'locked') {
      // Already completed
      if (pool.status === 'completed') {
        return NextResponse.json(
          { code: 'POOL_LOCKED', message: 'Pool is already completed' },
          { status: 400 }
        );
      }
      // Open - must lock first
      return NextResponse.json(
        { code: 'INVALID_TRANSITION', message: 'Pool must be locked before completing' },
        { status: 400 }
      );
    }

    // Check if locked/completed pools can be edited (after handling valid locked transitions)
    if (pool.status === 'locked' || pool.status === 'completed') {
      return NextResponse.json(
        { code: 'POOL_LOCKED', message: 'Pool is already locked or completed' },
        { status: 400 }
      );
    }

    // Handle status transitions
    if (targetStatus === 'locked' && pool.status === 'open') {
      await database
        .update(pools)
        .set({ status: 'locked', updatedAt: now })
        .where(eq(pools.id, pool.id));

      return NextResponse.json(
        { ...toPublicPool(pool), status: 'locked', updatedAt: now },
        { status: 200 }
      );
    }

    // Handle editing name/description (allowed in open)
    if (name !== undefined || description !== undefined) {
      const updates: Partial<typeof pools.$inferInsert> = { updatedAt: now };

      if (name !== undefined) {
        updates.name = name;
      }

      if (description !== undefined) {
        updates.description = description;
      }

      await database
        .update(pools)
        .set(updates)
        .where(eq(pools.id, pool.id));

      // Fetch updated pool
      const updatedResult = await database
        .select()
        .from(pools)
        .where(eq(pools.id, pool.id))
        .limit(1);

      return NextResponse.json(toPublicPool(updatedResult[0]), { status: 200 });
    }

    // No valid operation
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'No valid changes provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating pool:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to update pool' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pools/[code]
 * Returns pool by invite code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return getPoolHandler(request, code, db);
}

/**
 * PATCH /api/pools/[code]
 * Updates pool details or status (requires captain_secret)
 * - Body: { name?, description? } to edit details
 * - Body: { status: 'locked' } to lock an open pool
 * - Body: { status: 'completed' } to complete a locked pool
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  // CSRF protection
  const csrfError = requireValidOrigin(request);
  if (csrfError) return csrfError;

  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return updatePoolHandler(request, code, db);
}
