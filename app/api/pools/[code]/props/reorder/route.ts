import { NextRequest, NextResponse } from 'next/server';
import { pools, props } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { getSecret, requireValidOrigin, safeCompareSecrets } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';
import { z } from 'zod';

export type Database = LibSQLDatabase<typeof schema>;

const ReorderSchema = z.object({
  propIds: z.array(z.string().uuid()).min(1),
});

/**
 * Reorders props in a pool.
 * Exported for testing with injected database.
 */
export async function reorderPropsHandler(
  request: Request,
  code: string,
  database: Database
): Promise<Response> {
  try {
    const secret = await getSecret(code, request);

    if (!secret) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Missing secret' },
        { status: 401 }
      );
    }

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

    if (!safeCompareSecrets(pool.captainSecret, secret)) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', message: 'Invalid secret' },
        { status: 401 }
      );
    }

    if (pool.status !== 'open') {
      return NextResponse.json(
        { code: 'POOL_LOCKED', message: 'Cannot reorder props after pool is locked' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = ReorderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { propIds } = parseResult.data;
    const now = new Date().toISOString();

    // Update each prop's order in a batch
    await database.transaction(async (tx) => {
      for (let i = 0; i < propIds.length; i++) {
        await tx
          .update(props)
          .set({ order: i, updatedAt: now })
          .where(eq(props.id, propIds[i]));
      }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error reordering props:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to reorder props' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools/[code]/props/reorder
 * Reorders props in a pool (captain only, open pools only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<Response> {
  const csrfError = requireValidOrigin(request);
  if (csrfError) return csrfError;

  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return reorderPropsHandler(request, code, db);
}
