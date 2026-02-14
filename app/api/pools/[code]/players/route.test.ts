import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, players } from '@/src/lib/schema';
import { getPlayersHandler, type Database } from './route';
import { NextRequest } from 'next/server';
import { createCookieHeader } from '@/src/lib/test-helpers';

// Helper to create a mock GET Request
function createGetRequest(code: string, secret?: string) {
  const url = `http://localhost:3000/api/pools/${code}/players`;
  return new NextRequest(url, {
    method: 'GET',
    ...(secret ? { headers: { 'Cookie': createCookieHeader(code, secret) } } : {}),
  });
}

describe('GET /api/pools/[code]/players', () => {
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

  // Helper to create a test pool
  async function createTestPool(overrides: Partial<typeof pools.$inferInsert> = {}) {
    const now = new Date().toISOString();
    const poolData = {
      id: crypto.randomUUID(),
      name: 'Test Pool',
      inviteCode: 'PART01',
      captainName: 'Captain',
      captainSecret: crypto.randomUUID(),
      status: 'open' as const,
      description: null,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(pools).values(poolData);

    // Create captain as participant
    await db.insert(players).values({
      id: crypto.randomUUID(),
      poolId: poolData.id,
      name: poolData.captainName,
      secret: poolData.captainSecret,
      totalPoints: 0,
      paid: null,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    return poolData;
  }

  // Helper to add a participant
  async function addPlayer(
    poolId: string,
    name: string,
    overrides: Partial<typeof players.$inferInsert> = {}
  ) {
    const now = new Date().toISOString();
    const participantData = {
      id: crypto.randomUUID(),
      poolId,
      name,
      secret: crypto.randomUUID(),
      totalPoints: 0,
      paid: null,
      status: 'active' as const,
      joinedAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(players).values(participantData);
    return participantData;
  }

  describe('Happy Path', () => {
    it('returns all participants for an open pool', async () => {
      const pool = await createTestPool({ inviteCode: 'PART02' });
      await addPlayer(pool.id, 'Alice');
      await addPlayer(pool.id, 'Bob');

      const response = await getPlayersHandler(
        createGetRequest('PART02', pool.captainSecret),
        'PART02',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.players).toHaveLength(3); // Captain + Alice + Bob
    });

    it('returns participant names and points', async () => {
      const pool = await createTestPool({ inviteCode: 'PART03' });
      await addPlayer(pool.id, 'Alice', { totalPoints: 50 });

      const response = await getPlayersHandler(
        createGetRequest('PART03', pool.captainSecret),
        'PART03',
        db
      );

      const data = await response.json();
      const alice = data.players.find((p: { name: string }) => p.name === 'Alice');
      expect(alice).toBeDefined();
      expect(alice.name).toBe('Alice');
      expect(alice.totalPoints).toBe(50);
    });

    it('does not expose raw secrets but includes recovery URLs (security)', async () => {
      const pool = await createTestPool({ inviteCode: 'PART04' });
      await addPlayer(pool.id, 'Alice');

      const response = await getPlayersHandler(
        createGetRequest('PART04', pool.captainSecret),
        'PART04',
        db
      );

      const data = await response.json();
      // Raw secrets should never be exposed as a separate field
      for (const player of data.players) {
        expect(player.secret).toBeUndefined();
        expect(player.recoveryUrl).toBeDefined();
        expect(typeof player.recoveryUrl).toBe('string');
      }
    });

    it('returns captain recovery URL pointing to captain page', async () => {
      const pool = await createTestPool({ inviteCode: 'PART04B' });

      const response = await getPlayersHandler(
        createGetRequest('PART04B', pool.captainSecret),
        'PART04B',
        db
      );

      const data = await response.json();
      const captain = data.players.find((p: { isCaptain: boolean }) => p.isCaptain);
      expect(captain.recoveryUrl).toContain('/pool/PART04B/captain?token=');
    });

    it('returns player recovery URL pointing to picks page', async () => {
      const pool = await createTestPool({ inviteCode: 'PART04C' });
      await addPlayer(pool.id, 'Alice');

      const response = await getPlayersHandler(
        createGetRequest('PART04C', pool.captainSecret),
        'PART04C',
        db
      );

      const data = await response.json();
      const alice = data.players.find((p: { name: string }) => p.name === 'Alice');
      expect(alice.recoveryUrl).toContain('/pool/PART04C/picks?token=');
    });

    it('returns participants sorted by name', async () => {
      const pool = await createTestPool({ inviteCode: 'PART05' });
      await addPlayer(pool.id, 'Charlie');
      await addPlayer(pool.id, 'Alice');
      await addPlayer(pool.id, 'Bob');

      const response = await getPlayersHandler(
        createGetRequest('PART05', pool.captainSecret),
        'PART05',
        db
      );

      const data = await response.json();
      const names = data.players.map((p: { name: string }) => p.name);
      expect(names).toEqual(['Alice', 'Bob', 'Captain', 'Charlie']);
    });

    it('returns only captain for pool with no other participants', async () => {
      const pool = await createTestPool({ inviteCode: 'PART06' });

      const response = await getPlayersHandler(
        createGetRequest('PART06', pool.captainSecret),
        'PART06',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.players).toHaveLength(1); // Just captain
    });
  });

  describe('Open Pool Access', () => {
    it('returns participants for captain in open pool', async () => {
      const pool = await createTestPool({ inviteCode: 'PART07', status: 'open' });

      const response = await getPlayersHandler(
        createGetRequest('PART07', pool.captainSecret),
        'PART07',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.players).toHaveLength(1);
    });

    it('returns 401 for non-captain trying to view pool participants', async () => {
      await createTestPool({ inviteCode: 'PART08', status: 'open' });

      const response = await getPlayersHandler(
        createGetRequest('PART08'),
        'PART08',
        db
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for invalid pool code', async () => {
      const response = await getPlayersHandler(
        createGetRequest('INVALID'),
        'INVALID',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });
  });

  describe('Player Status', () => {
    it('returns all participants regardless of status', async () => {
      const pool = await createTestPool({ inviteCode: 'PART09' });
      await addPlayer(pool.id, 'Alice', { status: 'active' });
      await addPlayer(pool.id, 'Bob', { status: 'removed' });

      const response = await getPlayersHandler(
        createGetRequest('PART09', pool.captainSecret),
        'PART09',
        db
      );

      const data = await response.json();
      // Captain sees all participants including removed ones
      expect(data.players).toHaveLength(3); // Captain + Alice + Bob
      const names = data.players.map((p: { name: string }) => p.name);
      expect(names).toContain('Bob');
    });
  });
});
