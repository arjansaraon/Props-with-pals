import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, players, props } from '@/src/lib/schema';
import { getLeaderboardHandler, type Database } from './route';

// Helper to create a mock GET Request
function createRequest(code: string) {
  return new Request(`http://localhost:3000/api/pools/${code}/leaderboard`, {
    method: 'GET',
  });
}

describe('GET /api/pools/[code]/leaderboard', () => {
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

  // Helper to create a test pool with participants
  async function createTestPoolWithPlayers(
    inviteCode: string,
    participantData: Array<{ name: string; totalPoints: number }>
  ) {
    const now = new Date().toISOString();
    const poolData = {
      id: crypto.randomUUID(),
      name: 'Test Pool',
      inviteCode,
      captainName: 'Captain',
      captainSecret: crypto.randomUUID(),
      status: 'open' as const,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(pools).values(poolData);

    // Create participants
    for (const p of participantData) {
      await db.insert(players).values({
        id: crypto.randomUUID(),
        poolId: poolData.id,
        name: p.name,
        secret: crypto.randomUUID(),
        totalPoints: p.totalPoints,
        paid: null,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      });
    }

    return poolData;
  }

  describe('Happy Path', () => {
    it('returns participants ranked by total_points DESC', async () => {
      await createTestPoolWithPlayers('LEAD01', [
        { name: 'Alice', totalPoints: 10 },
        { name: 'Bob', totalPoints: 30 },
        { name: 'Carol', totalPoints: 20 },
      ]);

      const response = await getLeaderboardHandler(createRequest('LEAD01'), 'LEAD01', db);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.leaderboard).toHaveLength(3);
      expect(data.leaderboard[0].name).toBe('Bob');
      expect(data.leaderboard[0].totalPoints).toBe(30);
      expect(data.leaderboard[1].name).toBe('Carol');
      expect(data.leaderboard[1].totalPoints).toBe(20);
      expect(data.leaderboard[2].name).toBe('Alice');
      expect(data.leaderboard[2].totalPoints).toBe(10);
    });

    it('sorts by name ASC for ties (alphabetical)', async () => {
      await createTestPoolWithPlayers('LEAD02', [
        { name: 'Zach', totalPoints: 10 },
        { name: 'Alice', totalPoints: 10 },
        { name: 'Mike', totalPoints: 10 },
      ]);

      const response = await getLeaderboardHandler(createRequest('LEAD02'), 'LEAD02', db);

      const data = await response.json();

      expect(data.leaderboard[0].name).toBe('Alice');
      expect(data.leaderboard[1].name).toBe('Mike');
      expect(data.leaderboard[2].name).toBe('Zach');
    });

    it('includes name and totalPoints in response', async () => {
      await createTestPoolWithPlayers('LEAD03', [
        { name: 'Player1', totalPoints: 50 },
      ]);

      const response = await getLeaderboardHandler(createRequest('LEAD03'), 'LEAD03', db);

      const data = await response.json();

      expect(data.leaderboard[0]).toHaveProperty('name');
      expect(data.leaderboard[0]).toHaveProperty('totalPoints');
    });

    it('does NOT include secrets in response', async () => {
      await createTestPoolWithPlayers('LEAD04', [
        { name: 'Player1', totalPoints: 50 },
      ]);

      const response = await getLeaderboardHandler(createRequest('LEAD04'), 'LEAD04', db);

      const data = await response.json();

      expect(data.leaderboard[0].secret).toBeUndefined();
    });

    it('includes rank in response', async () => {
      await createTestPoolWithPlayers('LEAD05', [
        { name: 'Alice', totalPoints: 30 },
        { name: 'Bob', totalPoints: 20 },
      ]);

      const response = await getLeaderboardHandler(createRequest('LEAD05'), 'LEAD05', db);

      const data = await response.json();

      expect(data.leaderboard[0].rank).toBe(1);
      expect(data.leaderboard[1].rank).toBe(2);
    });
  });

  describe('Works for any pool status', () => {
    it('works for open pool', async () => {
      const now = new Date().toISOString();
      await db.insert(pools).values({
        id: crypto.randomUUID(),
        name: 'Open Pool',
        inviteCode: 'LEAD06',
        captainName: 'Captain',
        captainSecret: crypto.randomUUID(),
        status: 'open',
        buyInAmount: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await getLeaderboardHandler(createRequest('LEAD06'), 'LEAD06', db);
      expect(response.status).toBe(200);
    });

    it('works for locked pool', async () => {
      const now = new Date().toISOString();
      await db.insert(pools).values({
        id: crypto.randomUUID(),
        name: 'Locked Pool',
        inviteCode: 'LEAD07',
        captainName: 'Captain',
        captainSecret: crypto.randomUUID(),
        status: 'locked',
        buyInAmount: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await getLeaderboardHandler(createRequest('LEAD07'), 'LEAD07', db);
      expect(response.status).toBe(200);
    });

    it('works for completed pool', async () => {
      const now = new Date().toISOString();
      await db.insert(pools).values({
        id: crypto.randomUUID(),
        name: 'Completed Pool',
        inviteCode: 'LEAD08',
        captainName: 'Captain',
        captainSecret: crypto.randomUUID(),
        status: 'completed',
        buyInAmount: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await getLeaderboardHandler(createRequest('LEAD08'), 'LEAD08', db);
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for invalid pool code', async () => {
      const response = await getLeaderboardHandler(createRequest('INVALID'), 'INVALID', db);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });
  });

  describe('Edge Cases', () => {
    it('returns empty leaderboard for pool with no participants', async () => {
      const now = new Date().toISOString();
      await db.insert(pools).values({
        id: crypto.randomUUID(),
        name: 'Empty Pool',
        inviteCode: 'LEAD09',
        captainName: 'Captain',
        captainSecret: crypto.randomUUID(),
        status: 'open',
        buyInAmount: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await getLeaderboardHandler(createRequest('LEAD09'), 'LEAD09', db);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.leaderboard).toHaveLength(0);
    });
  });

  describe('isCaptain field', () => {
    it('marks player as captain when their secret matches pool captainSecret', async () => {
      const now = new Date().toISOString();
      const captainSecret = crypto.randomUUID();
      const poolId = crypto.randomUUID();

      await db.insert(pools).values({
        id: poolId,
        name: 'Test Pool',
        inviteCode: 'LEAD10',
        captainName: 'Captain Jane',
        captainSecret,
        status: 'open',
        buyInAmount: null,
        createdAt: now,
        updatedAt: now,
      });

      // Captain player (secret matches captainSecret)
      await db.insert(players).values({
        id: crypto.randomUUID(),
        poolId,
        name: 'Captain Jane',
        secret: captainSecret,
        totalPoints: 10,
        paid: null,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      });

      // Regular player
      await db.insert(players).values({
        id: crypto.randomUUID(),
        poolId,
        name: 'Regular Bob',
        secret: crypto.randomUUID(),
        totalPoints: 20,
        paid: null,
        status: 'active',
        joinedAt: now,
        updatedAt: now,
      });

      const response = await getLeaderboardHandler(createRequest('LEAD10'), 'LEAD10', db);
      const data = await response.json();

      const captain = data.leaderboard.find((p: { name: string }) => p.name === 'Captain Jane');
      const regular = data.leaderboard.find((p: { name: string }) => p.name === 'Regular Bob');

      expect(captain.isCaptain).toBe(true);
      expect(regular.isCaptain).toBe(false);
    });
  });

  describe('hasResolvedProps field', () => {
    it('returns false when no props have been resolved', async () => {
      const now = new Date().toISOString();
      const poolId = crypto.randomUUID();

      await db.insert(pools).values({
        id: poolId,
        name: 'Test Pool',
        inviteCode: 'LEAD11',
        captainName: 'Captain',
        captainSecret: crypto.randomUUID(),
        status: 'locked',
        buyInAmount: null,
        createdAt: now,
        updatedAt: now,
      });

      // Unresolved prop (correctOptionIndex is null)
      await db.insert(props).values({
        id: crypto.randomUUID(),
        poolId,
        questionText: 'Who will win?',
        options: ['Team A', 'Team B'],
        pointValue: 10,
        correctOptionIndex: null,
        status: 'active',
        order: 0,
        createdAt: now,
        updatedAt: now,
      });

      const response = await getLeaderboardHandler(createRequest('LEAD11'), 'LEAD11', db);
      const data = await response.json();

      expect(data.hasResolvedProps).toBe(false);
    });

    it('returns true when at least one prop has been resolved', async () => {
      const now = new Date().toISOString();
      const poolId = crypto.randomUUID();

      await db.insert(pools).values({
        id: poolId,
        name: 'Test Pool',
        inviteCode: 'LEAD12',
        captainName: 'Captain',
        captainSecret: crypto.randomUUID(),
        status: 'locked',
        buyInAmount: null,
        createdAt: now,
        updatedAt: now,
      });

      // Resolved prop
      await db.insert(props).values({
        id: crypto.randomUUID(),
        poolId,
        questionText: 'Who will win?',
        options: ['Team A', 'Team B'],
        pointValue: 10,
        correctOptionIndex: 0,
        status: 'active',
        order: 0,
        createdAt: now,
        updatedAt: now,
      });

      const response = await getLeaderboardHandler(createRequest('LEAD12'), 'LEAD12', db);
      const data = await response.json();

      expect(data.hasResolvedProps).toBe(true);
    });

    it('returns false when pool has no props', async () => {
      const now = new Date().toISOString();

      await db.insert(pools).values({
        id: crypto.randomUUID(),
        name: 'Empty Props Pool',
        inviteCode: 'LEAD13',
        captainName: 'Captain',
        captainSecret: crypto.randomUUID(),
        status: 'open',
        buyInAmount: null,
        createdAt: now,
        updatedAt: now,
      });

      const response = await getLeaderboardHandler(createRequest('LEAD13'), 'LEAD13', db);
      const data = await response.json();

      expect(data.hasResolvedProps).toBe(false);
    });
  });
});
