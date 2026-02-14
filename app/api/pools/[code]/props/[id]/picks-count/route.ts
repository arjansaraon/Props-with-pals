import { NextRequest, NextResponse } from 'next/server';
import { picks, props, pools } from '@/src/lib/schema';
import { eq, and, count } from 'drizzle-orm';
import { requireValidOrigin } from '@/src/lib/auth';
import { getPoolWithAuth } from '@/src/lib/api-helpers';

/**
 * GET /api/pools/[code]/props/[id]/picks-count
 * Returns the number of picks made for a specific prop.
 * Captain only - used to show warning when editing props with existing picks.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> }
): Promise<Response> {
  // CSRF protection
  const csrfError = requireValidOrigin(request);
  if (csrfError) return csrfError;

  const { db } = await import('@/src/lib/db');
  const { code, id: propId } = await params;

  try {
    // Get pool with captain auth check
    const result = await getPoolWithAuth(code, request, db, {
      requireCaptain: true,
    });
    if (!result.success) {
      return result.response;
    }

    const { pool } = result;

    // Verify prop exists and belongs to this pool
    const propResult = await db
      .select()
      .from(props)
      .where(and(eq(props.id, propId), eq(props.poolId, pool.id)))
      .limit(1);

    if (propResult.length === 0) {
      return NextResponse.json(
        { code: 'PROP_NOT_FOUND', message: 'Prop not found' },
        { status: 404 }
      );
    }

    // Count picks for this prop
    const pickCountResult = await db
      .select({ count: count() })
      .from(picks)
      .where(eq(picks.propId, propId));

    return NextResponse.json({ count: pickCountResult[0].count }, { status: 200 });
  } catch (error) {
    console.error('Error fetching picks count:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch picks count' },
      { status: 500 }
    );
  }
}
