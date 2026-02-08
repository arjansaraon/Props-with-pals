import { NextRequest, NextResponse } from 'next/server';
import * as schema from '@/src/lib/schema';
import { pools, players } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import { setPoolSecretCookie, requireValidOrigin } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Recovers a player's session by setting the auth cookie.
 * Used when a player opens a recovery link shared by the captain.
 * Exported for testing with injected database.
 */
export async function recoverHandler(
  request: Request,
  code: string,
  database: Database
): Promise<Response> {
  try {
    const body = await request.json();
    const { secret } = body;

    if (!secret || typeof secret !== 'string') {
      return NextResponse.json(
        { code: 'MISSING_SECRET', message: 'Secret is required' },
        { status: 400 }
      );
    }

    // Verify pool exists
    const poolResult = await database
      .select({ id: pools.id })
      .from(pools)
      .where(eq(pools.inviteCode, code))
      .limit(1);

    if (poolResult.length === 0) {
      return NextResponse.json(
        { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
        { status: 404 }
      );
    }

    // Verify secret matches a player in this pool
    const playerResult = await database
      .select({ id: players.id, name: players.name })
      .from(players)
      .where(and(eq(players.poolId, poolResult[0].id), eq(players.secret, secret)))
      .limit(1);

    if (playerResult.length === 0) {
      return NextResponse.json(
        { code: 'INVALID_SECRET', message: 'Invalid recovery link' },
        { status: 401 }
      );
    }

    // Set the auth cookie and return success
    const response = NextResponse.json(
      { success: true, name: playerResult[0].name },
      { status: 200 }
    );
    return setPoolSecretCookie(code, secret, response);
  } catch {
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to recover session' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[code]/recover
 * Sets the auth cookie for a player using their secret.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const csrfError = requireValidOrigin(request);
  if (csrfError) return csrfError;

  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return recoverHandler(request, code, db);
}
