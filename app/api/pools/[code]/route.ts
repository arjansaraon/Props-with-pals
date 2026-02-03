import { NextRequest, NextResponse } from 'next/server';
import { pools, props } from '@/src/lib/schema';
import { eq, and, count } from 'drizzle-orm';
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
 * Draft pools are only visible to the captain.
 * Exported for testing with injected database.
 */
export async function getPoolHandler(
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
 * - name/description: Can edit in draft or open status
 * - status transitions: draft→open, open→locked
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

    // Check if locked/completed pools can be edited
    if (pool.status === 'locked' || pool.status === 'completed') {
      return NextResponse.json(
        { code: 'POOL_LOCKED', message: 'Pool is already locked or completed' },
        { status: 400 }
      );
    }

    // Handle status transitions
    if (targetStatus === 'open' && pool.status === 'draft') {
      // Validate: pool must have at least 1 prop (optimized COUNT query)
      const [propCountResult] = await database
        .select({ count: count() })
        .from(props)
        .where(and(eq(props.poolId, pool.id), eq(props.status, 'active')));

      if (propCountResult.count === 0) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Add at least one prop before opening the pool' },
          { status: 400 }
        );
      }

      await database
        .update(pools)
        .set({ status: 'open', updatedAt: now })
        .where(eq(pools.id, pool.id));

      return NextResponse.json(
        { ...toPublicPool(pool), status: 'open', updatedAt: now },
        { status: 200 }
      );
    }

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

    // Invalid status transition
    if (targetStatus && pool.status === 'draft' && targetStatus === 'locked') {
      return NextResponse.json(
        { code: 'INVALID_TRANSITION', message: 'Cannot lock a draft pool. Open it first.' },
        { status: 400 }
      );
    }

    // Handle editing name/description (allowed in draft and open)
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
 * - Body: { status: 'open' } to open a draft pool
 * - Body: { status: 'locked' } to lock an open pool
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
