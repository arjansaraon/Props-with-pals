import { NextRequest, NextResponse } from 'next/server';
import { pools, props } from '@/src/lib/schema';
import { eq, count } from 'drizzle-orm';
import { CreatePropSchema } from '@/src/lib/validators';
import { getSecret, requireValidOrigin } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Creates a new prop for a pool.
 * Requires captain_secret for authorization.
 * Exported for testing with injected database.
 */
export async function createPropHandler(
  request: NextRequest,
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

    // Check authorization
    if (pool.captainSecret !== secret) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Invalid secret' },
        { status: 401 }
      );
    }

    // Check pool status - must be 'draft' to add props
    if (pool.status !== 'draft') {
      return NextResponse.json(
        { code: 'POOL_LOCKED', message: 'Cannot add props after pool is open' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = CreatePropSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { questionText, options, pointValue, category } = parseResult.data;

    // Get the next order number
    const countResult = await database
      .select({ count: count() })
      .from(props)
      .where(eq(props.poolId, pool.id));

    const nextOrder = countResult[0]?.count ?? 0;

    // Create the prop
    const propId = crypto.randomUUID();
    const now = new Date().toISOString();

    await database.insert(props).values({
      id: propId,
      poolId: pool.id,
      questionText,
      options,
      pointValue,
      category: category ?? null,
      correctOptionIndex: null,
      status: 'active',
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        id: propId,
        poolId: pool.id,
        questionText,
        options,
        pointValue,
        category: category ?? null,
        correctOptionIndex: null,
        status: 'active',
        order: nextOrder,
        createdAt: now,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating prop:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create prop' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[code]/props
 * Creates a new prop for a pool (requires captain_secret, draft status only)
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
  return createPropHandler(request, code, db);
}
