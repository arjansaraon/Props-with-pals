import { NextRequest, NextResponse } from 'next/server';
import { props } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getPoolWithAuth } from '@/src/lib/api-helpers';
import type { Database } from '@/src/lib/api-helpers';

export type { Database };

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
    const authResult = await getPoolWithAuth(code, request, database, { requireCaptain: true });
    if (!authResult.success) return authResult.response;
    const { pool } = authResult;

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
  const { db } = await import('@/src/lib/db');
  const { code } = await params;
  return reorderPropsHandler(request, code, db);
}
