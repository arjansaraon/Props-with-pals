import { NextRequest, NextResponse } from 'next/server';
import { pools, participants } from '@/src/lib/schema';
import { CreatePoolSchema } from '@/src/lib/validators';
import { generateInviteCode } from '@/src/lib/invite-code';
import { jsonResponseWithAuth, requireValidOrigin } from '@/src/lib/auth';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from '@/src/lib/schema';

export type Database = LibSQLDatabase<typeof schema>;

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

    const { name, captainName, buyInAmount, description } = parseResult.data;

    // Generate unique identifiers
    const poolId = crypto.randomUUID();
    const inviteCode = generateInviteCode();
    const captainSecret = crypto.randomUUID();
    const participantId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create pool and captain participant in a transaction
    await database.transaction(async (tx) => {
      // Insert pool (starts in 'draft' status)
      await tx.insert(pools).values({
        id: poolId,
        name,
        description: description ?? null,
        inviteCode,
        buyInAmount: buyInAmount ?? null,
        captainName,
        captainSecret,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });

      // Insert captain as participant (using same secret)
      await tx.insert(participants).values({
        id: participantId,
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

    // Return created pool with auth cookie set
    // Note: captainSecret still returned in response for backward compatibility during migration
    return jsonResponseWithAuth(
      {
        id: poolId,
        name,
        description: description ?? null,
        inviteCode,
        captainName,
        captainSecret,
        buyInAmount: buyInAmount ?? null,
        status: 'draft',
        createdAt: now,
      },
      inviteCode,
      captainSecret,
      201
    );
  } catch (error) {
    console.error('Error creating pool:', error);

    // Handle invite code collision (unique constraint violation)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
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
