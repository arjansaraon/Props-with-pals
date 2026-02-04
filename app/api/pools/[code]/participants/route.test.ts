import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, participants } from '@/src/lib/schema';
import { getParticipantsHandler, type Database } from './route';
import { NextRequest } from 'next/server';

// Helper to create a mock GET Request
function createGetRequest(code: string, secret?: string) {
  const url = secret
    ? `http://localhost:3000/api/pools/${code}/participants?secret=${secret}`
    : `http://localhost:3000/api/pools/${code}/participants`;
  return new NextRequest(url, {
    method: 'GET',
  });
}

describe('GET /api/pools/[code]/participants', () => {
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
    await db.insert(participants).values({
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
  async function addParticipant(
    poolId: string,
    name: string,
    overrides: Partial<typeof participants.$inferInsert> = {}
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

    await db.insert(participants).values(participantData);
    return participantData;
  }

  describe('Happy Path', () => {
    it('returns all participants for an open pool', async () => {
      const pool = await createTestPool({ inviteCode: 'PART02' });
      await addParticipant(pool.id, 'Alice');
      await addParticipant(pool.id, 'Bob');

      const response = await getParticipantsHandler(
        createGetRequest('PART02', pool.captainSecret),
        'PART02',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.participants).toHaveLength(3); // Captain + Alice + Bob
    });

    it('returns participant names and points', async () => {
      const pool = await createTestPool({ inviteCode: 'PART03' });
      await addParticipant(pool.id, 'Alice', { totalPoints: 50 });

      const response = await getParticipantsHandler(
        createGetRequest('PART03', pool.captainSecret),
        'PART03',
        db
      );

      const data = await response.json();
      const alice = data.participants.find((p: { name: string }) => p.name === 'Alice');
      expect(alice).toBeDefined();
      expect(alice.name).toBe('Alice');
      expect(alice.totalPoints).toBe(50);
    });

    it('returns participant secrets for captain to share links', async () => {
      const pool = await createTestPool({ inviteCode: 'PART04' });

      const response = await getParticipantsHandler(
        createGetRequest('PART04', pool.captainSecret),
        'PART04',
        db
      );

      const data = await response.json();
      // Captain can see secrets to share participant links
      expect(data.participants[0].secret).toBeDefined();
    });

    it('returns participants sorted by name', async () => {
      const pool = await createTestPool({ inviteCode: 'PART05' });
      await addParticipant(pool.id, 'Charlie');
      await addParticipant(pool.id, 'Alice');
      await addParticipant(pool.id, 'Bob');

      const response = await getParticipantsHandler(
        createGetRequest('PART05', pool.captainSecret),
        'PART05',
        db
      );

      const data = await response.json();
      const names = data.participants.map((p: { name: string }) => p.name);
      expect(names).toEqual(['Alice', 'Bob', 'Captain', 'Charlie']);
    });

    it('returns only captain for pool with no other participants', async () => {
      const pool = await createTestPool({ inviteCode: 'PART06' });

      const response = await getParticipantsHandler(
        createGetRequest('PART06', pool.captainSecret),
        'PART06',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.participants).toHaveLength(1); // Just captain
    });
  });

  describe('Draft Pool Access', () => {
    it('returns participants for captain in draft pool', async () => {
      const pool = await createTestPool({ inviteCode: 'PART07', status: 'draft' });

      const response = await getParticipantsHandler(
        createGetRequest('PART07', pool.captainSecret),
        'PART07',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.participants).toHaveLength(1);
    });

    it('returns 401 for non-captain trying to view pool participants', async () => {
      await createTestPool({ inviteCode: 'PART08', status: 'draft' });

      const response = await getParticipantsHandler(
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
      const response = await getParticipantsHandler(
        createGetRequest('INVALID'),
        'INVALID',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });
  });

  describe('Participant Status', () => {
    it('returns all participants regardless of status', async () => {
      const pool = await createTestPool({ inviteCode: 'PART09' });
      await addParticipant(pool.id, 'Alice', { status: 'active' });
      await addParticipant(pool.id, 'Bob', { status: 'removed' });

      const response = await getParticipantsHandler(
        createGetRequest('PART09', pool.captainSecret),
        'PART09',
        db
      );

      const data = await response.json();
      // Captain sees all participants including removed ones
      expect(data.participants).toHaveLength(3); // Captain + Alice + Bob
      const names = data.participants.map((p: { name: string }) => p.name);
      expect(names).toContain('Bob');
    });
  });
});
