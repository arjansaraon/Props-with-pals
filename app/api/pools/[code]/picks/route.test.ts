import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, players, props, picks } from '@/src/lib/schema';
import { eq, and } from 'drizzle-orm';
import { submitPickHandler, type Database } from './route';
import { createCookieHeader } from '@/src/lib/test-helpers';

// Helper to create a mock POST Request
function createRequest(code: string, secret: string, body: unknown) {
  return new Request(`http://localhost:3000/api/pools/${code}/picks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': createCookieHeader(code, secret),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/pools/[code]/picks', () => {
  let db: Database;
  let cleanup: () => void;

  beforeEach(async () => {
    const setup = await setupTestDb();
    db = setup.db as Database;
    cleanup = setup.cleanup;
  });

  afterEach(() => {
    cleanup?.();
  });

  // Helper to create a test pool with a prop and participant
  async function createTestPoolWithPropAndPlayer(
    poolOverrides: Partial<typeof pools.$inferInsert> = {}
  ) {
    const now = new Date().toISOString();
    const poolData = {
      id: crypto.randomUUID(),
      name: 'Test Pool',
      inviteCode: 'PICK01',
      captainName: 'Captain',
      captainSecret: crypto.randomUUID(),
      status: 'open' as const,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...poolOverrides,
    };

    await db.insert(pools).values(poolData);

    // Create a prop
    const propId = crypto.randomUUID();
    await db.insert(props).values({
      id: propId,
      poolId: poolData.id,
      questionText: 'Who will win?',
      options: ['Team A', 'Team B', 'Team C'],
      pointValue: 10,
      correctOptionIndex: null,
      category: null,
      status: 'active',
      order: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create a participant
    const playerId = crypto.randomUUID();
    const participantSecret = crypto.randomUUID();
    await db.insert(players).values({
      id: playerId,
      poolId: poolData.id,
      name: 'Test Player',
      secret: participantSecret,
      totalPoints: 0,
      paid: null,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    return {
      pool: poolData,
      propId,
      playerId,
      participantSecret,
    };
  }

  describe('Happy Path', () => {
    it('creates pick for participant', async () => {
      const { pool, propId, participantSecret } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK02',
      });

      const response = await submitPickHandler(
        createRequest('PICK02', participantSecret, {
          propId,
          selectedOptionIndex: 1,
        }),
        'PICK02',
        db
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.propId).toBe(propId);
      expect(data.selectedOptionIndex).toBe(1);
    });

    it('returns pick id as UUID', async () => {
      const { propId, participantSecret } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK03',
      });

      const response = await submitPickHandler(
        createRequest('PICK03', participantSecret, {
          propId,
          selectedOptionIndex: 0,
        }),
        'PICK03',
        db
      );

      const data = await response.json();
      expect(data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('overwrites existing pick (upsert)', async () => {
      const { propId, participantSecret, playerId } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK04',
      });

      // First pick
      await submitPickHandler(
        createRequest('PICK04', participantSecret, {
          propId,
          selectedOptionIndex: 0,
        }),
        'PICK04',
        db
      );

      // Second pick - overwrites
      const response = await submitPickHandler(
        createRequest('PICK04', participantSecret, {
          propId,
          selectedOptionIndex: 2,
        }),
        'PICK04',
        db
      );

      expect(response.status).toBe(200); // Updated, not created

      // Verify only one pick exists
      const allPicks = await db
        .select()
        .from(picks)
        .where(eq(picks.playerId, playerId));

      expect(allPicks).toHaveLength(1);
      expect(allPicks[0].selectedOptionIndex).toBe(2);
    });
  });

  describe('Authorization', () => {
    it('rejects wrong participant secret (401)', async () => {
      const { propId } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK05',
      });

      const response = await submitPickHandler(
        createRequest('PICK05', 'wrong-secret', {
          propId,
          selectedOptionIndex: 0,
        }),
        'PICK05',
        db
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('rejects missing secret (401)', async () => {
      const { propId } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK06',
      });

      const request = new Request('http://localhost:3000/api/pools/PICK06/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propId,
          selectedOptionIndex: 0,
        }),
      });

      const response = await submitPickHandler(request, 'PICK06', db);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Pool Status Checks', () => {
    it('rejects if pool is locked (403)', async () => {
      const { propId, participantSecret } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK07',
        status: 'locked',
      });

      const response = await submitPickHandler(
        createRequest('PICK07', participantSecret, {
          propId,
          selectedOptionIndex: 0,
        }),
        'PICK07',
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects if pool is completed (403)', async () => {
      const { propId, participantSecret } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK08',
        status: 'completed',
      });

      const response = await submitPickHandler(
        createRequest('PICK08', participantSecret, {
          propId,
          selectedOptionIndex: 0,
        }),
        'PICK08',
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });
  });

  describe('Validation', () => {
    it('rejects invalid prop_id (404)', async () => {
      const { participantSecret } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK09',
      });

      const response = await submitPickHandler(
        createRequest('PICK09', participantSecret, {
          propId: '00000000-0000-0000-0000-000000000000',
          selectedOptionIndex: 0,
        }),
        'PICK09',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('PROP_NOT_FOUND');
    });

    it('rejects negative option index (400)', async () => {
      const { propId, participantSecret } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK10',
      });

      const response = await submitPickHandler(
        createRequest('PICK10', participantSecret, {
          propId,
          selectedOptionIndex: -1,
        }),
        'PICK10',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects option index out of range (400)', async () => {
      const { propId, participantSecret } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK11',
      });

      const response = await submitPickHandler(
        createRequest('PICK11', participantSecret, {
          propId,
          selectedOptionIndex: 10, // Only 3 options exist
        }),
        'PICK11',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_OPTION');
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for invalid pool code', async () => {
      const response = await submitPickHandler(
        createRequest('INVALID', 'any-secret', {
          propId: '00000000-0000-0000-0000-000000000000',
          selectedOptionIndex: 0,
        }),
        'INVALID',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });

    it('rejects query param secret with no cookie (401)', async () => {
      const { propId, participantSecret } = await createTestPoolWithPropAndPlayer({
        inviteCode: 'PICK12',
      });

      // Send secret only in the URL query param, no Cookie header
      const request = new Request(
        `http://localhost:3000/api/pools/PICK12/picks?secret=${participantSecret}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propId,
            selectedOptionIndex: 0,
          }),
        }
      );

      const response = await submitPickHandler(request, 'PICK12', db);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });
});
