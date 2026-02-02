import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

/**
 * Creates an in-memory SQLite database for testing.
 * Each call creates a fresh, isolated database instance.
 */
export function createTestDb() {
  const client = createClient({
    url: ':memory:',
  });

  const db = drizzle(client, { schema });

  return { db, client };
}

/**
 * Sets up the test database with the schema.
 * Call this in beforeEach to get a fresh database for each test.
 */
export async function setupTestDb() {
  const { db, client } = createTestDb();

  // Create tables
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      buy_in_amount TEXT,
      captain_name TEXT NOT NULL,
      captain_secret TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS props (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL REFERENCES pools(id),
      question_text TEXT NOT NULL,
      options TEXT NOT NULL,
      point_value INTEGER NOT NULL,
      correct_option_index INTEGER,
      category TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      "order" INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL REFERENCES pools(id),
      name TEXT NOT NULL,
      secret TEXT NOT NULL,
      total_points INTEGER NOT NULL DEFAULT 0,
      paid INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS picks (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL REFERENCES participants(id),
      prop_id TEXT NOT NULL REFERENCES props(id),
      selected_option_index INTEGER NOT NULL,
      points_earned INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_pool_name ON participants(pool_id, name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_picks_participant_prop ON picks(participant_id, prop_id);
    CREATE INDEX IF NOT EXISTS idx_props_pool ON props(pool_id);
    CREATE INDEX IF NOT EXISTS idx_participants_pool ON participants(pool_id);
    CREATE INDEX IF NOT EXISTS idx_participants_pool_secret ON participants(pool_id, secret);
    CREATE INDEX IF NOT EXISTS idx_picks_participant ON picks(participant_id);
    CREATE INDEX IF NOT EXISTS idx_picks_prop ON picks(prop_id);
  `);

  return { db, client };
}
