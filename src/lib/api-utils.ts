import { NextResponse } from 'next/server';
import { pools, participants } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

// Type for pool from database
export type Pool = typeof pools.$inferSelect;
export type Participant = typeof participants.$inferSelect;

/**
 * Error responses for API routes
 */
export const ApiErrors = {
  poolNotFound: () =>
    NextResponse.json(
      { code: 'POOL_NOT_FOUND', message: 'Pool not found' },
      { status: 404 }
    ),
  unauthorized: (message = 'Invalid secret') =>
    NextResponse.json({ code: 'UNAUTHORIZED', message }, { status: 401 }),
  missingSecret: () =>
    NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Missing secret' },
      { status: 401 }
    ),
  poolLocked: (message = 'Pool is locked or completed') =>
    NextResponse.json({ code: 'POOL_LOCKED', message }, { status: 403 }),
  poolNotLocked: () =>
    NextResponse.json(
      { code: 'POOL_NOT_LOCKED', message: 'Pool must be locked first' },
      { status: 403 }
    ),
  validationError: (message: string) =>
    NextResponse.json({ code: 'VALIDATION_ERROR', message }, { status: 400 }),
  internalError: (message = 'Internal server error') =>
    NextResponse.json({ code: 'INTERNAL_ERROR', message }, { status: 500 }),
  propNotFound: () =>
    NextResponse.json(
      { code: 'PROP_NOT_FOUND', message: 'Prop not found' },
      { status: 404 }
    ),
  nameTaken: () =>
    NextResponse.json(
      { code: 'NAME_TAKEN', message: 'Name is already taken in this pool' },
      { status: 409 }
    ),
  invalidOption: () =>
    NextResponse.json(
      { code: 'INVALID_OPTION', message: 'Option index out of range' },
      { status: 400 }
    ),
  alreadyResolved: () =>
    NextResponse.json(
      { code: 'ALREADY_RESOLVED', message: 'Prop has already been resolved' },
      { status: 400 }
    ),
} as const;

/**
 * Extracts the secret from request URL query parameters.
 */
export function getSecretFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('secret');
}

/**
 * Finds a pool by invite code.
 * Returns null if not found.
 */
export async function findPoolByCode(
  database: Database,
  code: string
): Promise<Pool | null> {
  const result = await database
    .select()
    .from(pools)
    .where(eq(pools.inviteCode, code))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Validates that a secret matches the captain secret.
 * Returns an error response if invalid, null if valid.
 */
export function validateCaptainSecret(
  pool: Pool,
  secret: string
): NextResponse | null {
  if (pool.captainSecret !== secret) {
    return ApiErrors.unauthorized();
  }
  return null;
}

/**
 * Finds a participant by pool ID and secret.
 * Returns null if not found.
 */
export async function findParticipantBySecret(
  database: Database,
  poolId: string,
  secret: string
): Promise<Participant | null> {
  const result = await database
    .select()
    .from(participants)
    .where(and(eq(participants.poolId, poolId), eq(participants.secret, secret)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Validates that a pool is in 'open' status.
 * Returns an error response if not open, null if open.
 */
export function requirePoolOpen(
  pool: Pool,
  action: string
): NextResponse | null {
  if (pool.status !== 'open') {
    return ApiErrors.poolLocked(`Cannot ${action} on locked or completed pool`);
  }
  return null;
}

/**
 * Validates that a pool is in 'locked' status (for resolving props).
 * Returns an error response if not locked, null if locked.
 */
export function requirePoolLocked(pool: Pool): NextResponse | null {
  if (pool.status === 'open') {
    return ApiErrors.poolNotLocked();
  }
  if (pool.status === 'completed') {
    return ApiErrors.poolLocked('Pool is already completed');
  }
  return null;
}
