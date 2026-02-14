import { NextRequest, NextResponse } from 'next/server';
import * as schema from '@/src/lib/schema';
import { pools } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { setPoolSecretCookie, requireValidOrigin } from '@/src/lib/auth';
import { redeemToken } from '@/src/lib/recovery-tokens';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Recovers a player's session using an opaque recovery token.
 * Validates the token, sets the auth cookie, and marks the token as used.
 * Exported for testing with injected database.
 */
export async function recoverHandler(
  request: Request,
  code: string,
  database: Database
): Promise<Response> {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { code: 'MISSING_TOKEN', message: 'Recovery token is required' },
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

    // Redeem the token (validates, marks used, returns player info)
    const result = await redeemToken(database, token, poolResult[0].id);

    if (!result) {
      return NextResponse.json(
        { code: 'INVALID_TOKEN', message: 'Invalid or expired recovery link' },
        { status: 401 }
      );
    }

    // Set the auth cookie with the player's actual secret
    const response = NextResponse.json(
      { success: true, name: result.playerName },
      { status: 200 }
    );
    return setPoolSecretCookie(code, result.playerSecret, response);
  } catch {
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to recover session' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[code]/recover
 * Sets the auth cookie for a player using a recovery token.
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
