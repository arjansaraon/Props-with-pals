import { NextResponse } from 'next/server';
import { pools } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Gets a pool by invite code.
 * Exported for testing with injected database.
 */
export async function getPoolHandler(
  request: Request,
  code: string,
  database: Database
): Promise<Response> {
  try {
    const pool = await database
      .select()
      .from(pools)
      .where(eq(pools.inviteCode, code))
      .limit(1);

    if (pool.length === 0) {
      return NextResponse.json(
        { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
        { status: 404 }
      );
    }

    // Return pool WITHOUT captain_secret (security)
    const { captainSecret, ...publicPool } = pool[0];

    return NextResponse.json(publicPool, { status: 200 });
  } catch (error) {
    console.error('Error getting pool:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to get pool' },
      { status: 500 }
    );
  }
}

/**
 * Locks a pool (changes status from 'open' to 'locked').
 * Requires captain_secret for authorization.
 * Exported for testing with injected database.
 */
export async function lockPoolHandler(
  request: Request,
  code: string,
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

    // Check pool status - must be 'open' to lock
    if (pool.status !== 'open') {
      return NextResponse.json(
        { code: 'POOL_LOCKED', message: 'Pool is already locked or completed' },
        { status: 400 }
      );
    }

    // Update pool status to 'locked'
    const now = new Date().toISOString();
    await database
      .update(pools)
      .set({ status: 'locked', updatedAt: now })
      .where(eq(pools.id, pool.id));

    // Return updated pool WITHOUT captain_secret
    const { captainSecret, ...publicPool } = pool;

    return NextResponse.json(
      { ...publicPool, status: 'locked', updatedAt: now },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error locking pool:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to lock pool' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pools/[code]
 * Returns pool by invite code
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return getPoolHandler(request, code, db);
}

/**
 * PATCH /api/pools/[code]
 * Locks a pool (requires captain_secret)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return lockPoolHandler(request, code, db);
}
