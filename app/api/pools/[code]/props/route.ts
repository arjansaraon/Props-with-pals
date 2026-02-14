import { NextRequest, NextResponse } from 'next/server';
import { props } from '@/src/lib/schema';
import { eq, count } from 'drizzle-orm';
import { CreatePropSchema } from '@/src/lib/validators';
import { getPoolWithAuth } from '@/src/lib/api-helpers';
import type { Database } from '@/src/lib/api-helpers';

export type { Database };

/**
 * Creates a new prop for a pool.
 * Requires captain_secret for authorization.
 * Exported for testing with injected database.
 */
export async function createPropHandler(
  request: Request,
  code: string,
  database: Database
): Promise<Response> {
  try {
    const authResult = await getPoolWithAuth(code, request, database, { requireCaptain: true });
    if (!authResult.success) return authResult.response;
    const { pool } = authResult;

    // Check pool status - must be 'open' to add props
    if (pool.status !== 'open') {
      return NextResponse.json(
        { code: 'POOL_LOCKED', message: 'Cannot add props after pool is locked' },
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
    console.error('Error creating prop:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create prop' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[code]/props
 * Creates a new prop for a pool (requires captain_secret, open status only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return createPropHandler(request, code, db);
}
