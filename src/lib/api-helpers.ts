import { NextRequest, NextResponse } from 'next/server';
import { pools, type Pool } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { getSecret, safeCompareSecrets } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Result of getPoolWithAuth - either success with pool data or error response
 */
export type PoolAuthResult =
  | { success: true; pool: Pool; isCaptain: boolean }
  | { success: false; response: Response };

/**
 * Finds a pool by invite code and optionally validates authorization.
 *
 * @param code - The pool invite code
 * @param request - The NextRequest (for extracting secret)
 * @param database - The database instance
 * @param options.requireCaptain - If true, requires captain secret (returns 401 if invalid)
 *
 * Behavior:
 * - If pool not found: returns 404
 * - If requireCaptain and no/wrong secret: returns 401
 */
export async function getPoolWithAuth(
  code: string,
  request: Request,
  database: Database,
  options: { requireCaptain?: boolean } = {}
): Promise<PoolAuthResult> {
  const { requireCaptain = false } = options;

  // Find pool by invite code
  const poolResult = await database
    .select()
    .from(pools)
    .where(eq(pools.inviteCode, code))
    .limit(1);

  if (poolResult.length === 0) {
    return {
      success: false,
      response: NextResponse.json(
        { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
        { status: 404 }
      ),
    };
  }

  const pool = poolResult[0];

  // Get secret from cookie or query params
  const secret = await getSecret(code, request);

  // Check if user is the captain (using timing-safe comparison)
  const isCaptain = safeCompareSecrets(secret, pool.captainSecret);

  // If captain access is required, validate
  if (requireCaptain) {
    if (!secret) {
      return {
        success: false,
        response: NextResponse.json(
          { code: 'UNAUTHORIZED', message: 'Missing secret' },
          { status: 401 }
        ),
      };
    }

    if (!isCaptain) {
      return {
        success: false,
        response: NextResponse.json(
          { code: 'UNAUTHORIZED', message: 'Invalid secret' },
          { status: 401 }
        ),
      };
    }
  }

  return { success: true, pool, isCaptain };
}

/**
 * Standard error responses for pool status checks
 */
export const poolStatusErrors = {
  locked: () =>
    NextResponse.json(
      { code: 'POOL_LOCKED', message: 'Pool is already locked or completed' },
      { status: 400 }
    ),
  cannotEditAfterLocked: () =>
    NextResponse.json(
      { code: 'POOL_LOCKED', message: 'Cannot edit props after pool is locked' },
      { status: 403 }
    ),
  cannotDeleteAfterLocked: () =>
    NextResponse.json(
      { code: 'POOL_LOCKED', message: 'Cannot delete props after pool is locked' },
      { status: 403 }
    ),
  cannotJoinLocked: () =>
    NextResponse.json(
      { code: 'POOL_LOCKED', message: 'Cannot join locked or completed pool' },
      { status: 403 }
    ),
};

/**
 * Removes captainSecret from pool data for public responses
 */
export function toPublicPool(pool: Pool): Omit<Pool, 'captainSecret'> {
  const { captainSecret, ...publicPool } = pool;
  return publicPool;
}
