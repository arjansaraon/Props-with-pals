import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, players, props, picks } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { resolvePropHandler, type Database } from './route';
import { createCookieHeader } from '@/src/lib/test-helpers';

// Helper to create a mock POST Request
function createRequest(code: string, propId: string, secret: string, body: unknown) {
  return new Request(
    `http://localhost:3000/api/pools/${code}/props/${propId}/resolve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': createCookieHeader(code, secret),
      },
      body: JSON.stringify(body),
    }
  );
}

describe('POST /api/pools/[code]/props/[id]/resolve', () => {
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

  // Helper to create a full test setup
  async function createFullTestSetup(
    inviteCode: string,
    poolStatus: 'open' | 'locked' | 'completed' = 'locked'
  ) {
    const now = new Date().toISOString();

    // Create pool
    const poolId = crypto.randomUUID();
    const captainSecret = crypto.randomUUID();
    await db.insert(pools).values({
      id: poolId,
      name: 'Test Pool',
      inviteCode,
      captainName: 'Captain',
      captainSecret,
      status: poolStatus,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create prop
    const propId = crypto.randomUUID();
    await db.insert(props).values({
      id: propId,
      poolId,
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

    // Create participants with picks
    const participant1Id = crypto.randomUUID();
    const participant2Id = crypto.randomUUID();
    const participant3Id = crypto.randomUUID();

    await db.insert(players).values([
      {
        id: participant1Id,
        poolId,
        name: 'Alice',
        secret: crypto.randomUUID(),
        totalPoints: 0,
        paid: null,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      },
      {
        id: participant2Id,
        poolId,
        name: 'Bob',
        secret: crypto.randomUUID(),
        totalPoints: 0,
        paid: null,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      },
      {
        id: participant3Id,
        poolId,
        name: 'Carol',
        secret: crypto.randomUUID(),
        totalPoints: 0,
        paid: null,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      },
    ]);

    // Create picks: Alice picks 0, Bob picks 1, Carol picks 1
    await db.insert(picks).values([
      {
        id: crypto.randomUUID(),
        playerId: participant1Id,
        propId,
        selectedOptionIndex: 0, // Team A
        pointsEarned: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        playerId: participant2Id,
        propId,
        selectedOptionIndex: 1, // Team B
        pointsEarned: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        playerId: participant3Id,
        propId,
        selectedOptionIndex: 1, // Team B
        pointsEarned: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    return {
      poolId,
      propId,
      captainSecret,
      participant1Id,
      participant2Id,
      participant3Id,
    };
  }

  describe('Happy Path', () => {
    it('sets correct_option_index on prop', async () => {
      const { propId, captainSecret } = await createFullTestSetup('RES01');

      const response = await resolvePropHandler(
        createRequest('RES01', propId, captainSecret, { correctOptionIndex: 1 }),
        'RES01',
        propId,
        db
      );

      expect(response.status).toBe(200);

      // Verify prop was updated
      const propResult = await db.select().from(props).where(eq(props.id, propId));
      expect(propResult[0].correctOptionIndex).toBe(1);
    });

    it('returns updated prop in response', async () => {
      const { propId, captainSecret } = await createFullTestSetup('RES02');

      const response = await resolvePropHandler(
        createRequest('RES02', propId, captainSecret, { correctOptionIndex: 0 }),
        'RES02',
        propId,
        db
      );

      const data = await response.json();
      expect(data.prop.correctOptionIndex).toBe(0);
    });
  });

  describe('Points Calculation', () => {
    it('correct pick earns prop.point_value points', async () => {
      const { propId, captainSecret, participant2Id } = await createFullTestSetup('RES03');

      // Resolve with correct answer = 1 (Bob and Carol picked 1)
      await resolvePropHandler(
        createRequest('RES03', propId, captainSecret, { correctOptionIndex: 1 }),
        'RES03',
        propId,
        db
      );

      // Check Bob's pick
      const bobPicks = await db
        .select()
        .from(picks)
        .where(eq(picks.playerId, participant2Id));

      expect(bobPicks[0].pointsEarned).toBe(10);
    });

    it('incorrect pick earns 0 points', async () => {
      const { propId, captainSecret, participant1Id } = await createFullTestSetup('RES04');

      // Resolve with correct answer = 1 (Alice picked 0)
      await resolvePropHandler(
        createRequest('RES04', propId, captainSecret, { correctOptionIndex: 1 }),
        'RES04',
        propId,
        db
      );

      // Check Alice's pick
      const alicePicks = await db
        .select()
        .from(picks)
        .where(eq(picks.playerId, participant1Id));

      expect(alicePicks[0].pointsEarned).toBe(0);
    });

    it('updates participant total_points correctly', async () => {
      const { propId, captainSecret, participant1Id, participant2Id, participant3Id } =
        await createFullTestSetup('RES05');

      // Resolve with correct answer = 1
      await resolvePropHandler(
        createRequest('RES05', propId, captainSecret, { correctOptionIndex: 1 }),
        'RES05',
        propId,
        db
      );

      // Alice picked 0 (wrong) = 0 points
      const alice = await db
        .select()
        .from(players)
        .where(eq(players.id, participant1Id));
      expect(alice[0].totalPoints).toBe(0);

      // Bob picked 1 (correct) = 10 points
      const bob = await db
        .select()
        .from(players)
        .where(eq(players.id, participant2Id));
      expect(bob[0].totalPoints).toBe(10);

      // Carol picked 1 (correct) = 10 points
      const carol = await db
        .select()
        .from(players)
        .where(eq(players.id, participant3Id));
      expect(carol[0].totalPoints).toBe(10);
    });
  });

  describe('Pool Status After Resolve (No Auto-Complete)', () => {
    it('keeps pool status as locked after resolving all props', async () => {
      const { poolId, propId, captainSecret } = await createFullTestSetup('RES06');

      await resolvePropHandler(
        createRequest('RES06', propId, captainSecret, { correctOptionIndex: 0 }),
        'RES06',
        propId,
        db
      );

      // Pool should remain locked (captain must manually complete)
      const poolResult = await db.select().from(pools).where(eq(pools.id, poolId));
      expect(poolResult[0].status).toBe('locked');
    });

    it('returns pool status as locked in response', async () => {
      const { propId, captainSecret } = await createFullTestSetup('RES07');

      const response = await resolvePropHandler(
        createRequest('RES07', propId, captainSecret, { correctOptionIndex: 0 }),
        'RES07',
        propId,
        db
      );

      const data = await response.json();
      expect(data.pool.status).toBe('locked');
    });
  });

  describe('Authorization', () => {
    it('rejects missing secret (401)', async () => {
      const { propId } = await createFullTestSetup('RES08');

      const request = new Request(
        `http://localhost:3000/api/pools/RES08/props/${propId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correctOptionIndex: 0 }),
        }
      );

      const response = await resolvePropHandler(request, 'RES08', propId, db);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('rejects wrong secret (401)', async () => {
      const { propId } = await createFullTestSetup('RES09');

      const response = await resolvePropHandler(
        createRequest('RES09', propId, 'wrong-secret', { correctOptionIndex: 0 }),
        'RES09',
        propId,
        db
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Pool Status Checks', () => {
    it('rejects if pool is open (403 POOL_NOT_LOCKED)', async () => {
      const { propId, captainSecret } = await createFullTestSetup('RES10', 'open');

      const response = await resolvePropHandler(
        createRequest('RES10', propId, captainSecret, { correctOptionIndex: 0 }),
        'RES10',
        propId,
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_LOCKED');
    });

    it('rejects if pool is completed (403 POOL_LOCKED)', async () => {
      const { propId, captainSecret } = await createFullTestSetup('RES11', 'completed');

      const response = await resolvePropHandler(
        createRequest('RES11', propId, captainSecret, { correctOptionIndex: 0 }),
        'RES11',
        propId,
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });
  });

  describe('Re-Resolving Props (Edit Correct Answer)', () => {
    it('allows re-resolving a prop while pool is locked', async () => {
      const { propId, captainSecret } = await createFullTestSetup('RES12');

      // First resolve with answer = 0
      await resolvePropHandler(
        createRequest('RES12', propId, captainSecret, { correctOptionIndex: 0 }),
        'RES12',
        propId,
        db
      );

      // Change to answer = 1
      const response = await resolvePropHandler(
        createRequest('RES12', propId, captainSecret, { correctOptionIndex: 1 }),
        'RES12',
        propId,
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.prop.correctOptionIndex).toBe(1);
    });

    it('recalculates points when re-resolving', async () => {
      const { propId, captainSecret, participant1Id, participant2Id, participant3Id } =
        await createFullTestSetup('RES12B');

      // First resolve: answer = 0 (Alice picked 0 = correct, Bob/Carol picked 1 = wrong)
      await resolvePropHandler(
        createRequest('RES12B', propId, captainSecret, { correctOptionIndex: 0 }),
        'RES12B',
        propId,
        db
      );

      // Check Alice has 10 points, Bob/Carol have 0
      let alice = await db.select().from(players).where(eq(players.id, participant1Id));
      let bob = await db.select().from(players).where(eq(players.id, participant2Id));
      expect(alice[0].totalPoints).toBe(10);
      expect(bob[0].totalPoints).toBe(0);

      // Re-resolve: answer = 1 (Alice picked 0 = wrong, Bob/Carol picked 1 = correct)
      await resolvePropHandler(
        createRequest('RES12B', propId, captainSecret, { correctOptionIndex: 1 }),
        'RES12B',
        propId,
        db
      );

      // Check Alice now has 0 points, Bob/Carol now have 10
      alice = await db.select().from(players).where(eq(players.id, participant1Id));
      bob = await db.select().from(players).where(eq(players.id, participant2Id));
      const carol = await db.select().from(players).where(eq(players.id, participant3Id));
      expect(alice[0].totalPoints).toBe(0);
      expect(bob[0].totalPoints).toBe(10);
      expect(carol[0].totalPoints).toBe(10);
    });
  });

  describe('Prop Validation', () => {
    it('rejects negative correctOptionIndex (400)', async () => {
      const { propId, captainSecret } = await createFullTestSetup('RES13');

      const response = await resolvePropHandler(
        createRequest('RES13', propId, captainSecret, { correctOptionIndex: -1 }),
        'RES13',
        propId,
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects correctOptionIndex >= options.length (400)', async () => {
      const { propId, captainSecret } = await createFullTestSetup('RES14');

      const response = await resolvePropHandler(
        createRequest('RES14', propId, captainSecret, { correctOptionIndex: 10 }),
        'RES14',
        propId,
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_OPTION');
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for invalid pool code', async () => {
      const response = await resolvePropHandler(
        createRequest('INVALID', 'any-prop-id', 'any-secret', { correctOptionIndex: 0 }),
        'INVALID',
        'any-prop-id',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });

    it('returns 404 for invalid prop id', async () => {
      const { captainSecret } = await createFullTestSetup('RES15');

      const response = await resolvePropHandler(
        createRequest('RES15', '00000000-0000-0000-0000-000000000000', captainSecret, {
          correctOptionIndex: 0,
        }),
        'RES15',
        '00000000-0000-0000-0000-000000000000',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('PROP_NOT_FOUND');
    });
  });

  describe('Edge Cases', () => {
    it('handles prop with no picks', async () => {
      const now = new Date().toISOString();

      // Create pool without picks
      const poolId = crypto.randomUUID();
      const captainSecret = crypto.randomUUID();
      await db.insert(pools).values({
        id: poolId,
        name: 'No Picks Pool',
        inviteCode: 'RES16',
        captainName: 'Captain',
        captainSecret,
        status: 'locked',
        buyInAmount: null,
        createdAt: now,
        updatedAt: now,
      });

      const propId = crypto.randomUUID();
      await db.insert(props).values({
        id: propId,
        poolId,
        questionText: 'Test',
        options: ['A', 'B'],
        pointValue: 10,
        correctOptionIndex: null,
        category: null,
        status: 'active',
        order: 0,
        createdAt: now,
        updatedAt: now,
      });

      const response = await resolvePropHandler(
        createRequest('RES16', propId, captainSecret, { correctOptionIndex: 0 }),
        'RES16',
        propId,
        db
      );

      expect(response.status).toBe(200);
    });
  });
});
