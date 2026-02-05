import { NextRequest, NextResponse } from 'next/server';
import { pools, players } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { CreatePoolSchema } from '@/src/lib/validators';
import { generateInviteCode } from '@/src/lib/invite-code';
import { jsonResponseWithAuth, requireValidOrigin } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

/**
 * Normalizes a name for use in invite code prefix.
 * e.g., "John Smith" -> "john-smith", "Bob123" -> "bob123"
 */
function normalizeNameForCode(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/[^a-z0-9-]/g, '')     // remove special chars
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '');         // trim leading/trailing hyphens
}

/**
 * Creates a new pool and adds the captain as the first participant.
 * Exported for testing with injected database.
 */
export async function createPoolHandler(
  request: Request,
  database: Database
): Promise<Response> {
  try {
    const body = await request.json();

    // Validate input
    const parseResult = CreatePoolSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, captainName, buyInAmount, description, inviteCode: customCodeSuffix } = parseResult.data;

    // Determine invite code: if custom suffix provided, prefix with captain name; otherwise auto-generate
    let inviteCode: string;
    if (customCodeSuffix) {
      // Combine normalized captain name with custom suffix: "john-superbowl-2026"
      const captainPrefix = normalizeNameForCode(captainName);
      inviteCode = captainPrefix ? `${captainPrefix}-${customCodeSuffix}` : customCodeSuffix;

      // Check if combined code is already in use
      const existingPool = await database
        .select({ id: pools.id })
        .from(pools)
        .where(eq(pools.inviteCode, inviteCode))
        .limit(1);

      if (existingPool.length > 0) {
        return NextResponse.json(
          { code: 'CODE_TAKEN', message: 'This invite code is already in use' },
          { status: 409 }
        );
      }
    } else {
      inviteCode = generateInviteCode();
    }

    // Generate unique identifiers
    const poolId = crypto.randomUUID();
    const captainSecret = crypto.randomUUID();
    const playerId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create pool and captain participant in a transaction
    await database.transaction(async (tx) => {
      // Insert pool (starts in 'open' status)
      await tx.insert(pools).values({
        id: poolId,
        name,
        description: description ?? null,
        inviteCode,
        buyInAmount: buyInAmount ?? null,
        captainName,
        captainSecret,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      });

      // Insert captain as participant (using same secret)
      await tx.insert(players).values({
        id: playerId,
        poolId,
        name: captainName,
        secret: captainSecret,
        totalPoints: 0,
        paid: null,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      });
    });

    // Return created pool with auth cookie set (secret is in httpOnly cookie, not response body)
    return jsonResponseWithAuth(
      {
        id: poolId,
        name,
        description: description ?? null,
        inviteCode,
        captainName,
        buyInAmount: buyInAmount ?? null,
        status: 'open',
        createdAt: now,
      },
      inviteCode,
      captainSecret,
      201
    );
  } catch (error) {
    console.error('Error creating pool:', error);

    // Handle invite code collision (unique constraint violation)
    // This can happen with auto-generated codes or race conditions with custom codes
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('inviteCode') || error.message.includes('invite_code')) {
        return NextResponse.json(
          { code: 'CODE_TAKEN', message: 'This invite code is already in use. Please try a different one.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { code: 'INTERNAL_ERROR', message: 'Please try again' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Failed to create pool' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pools
 * Creates a new pool
 */
export async function POST(request: NextRequest): Promise<Response> {
  // CSRF protection
  const csrfError = requireValidOrigin(request);
  if (csrfError) return csrfError;

  // Lazy import to avoid loading production db during tests
  const { db } = await import('@/src/lib/db');
  return createPoolHandler(request, db);
}
