# Phase 1: Vertical Slice

> **Goal**: Prove the full flow works end-to-end with minimal features
>
> One captain, one participant, one prop, one pick → score calculated. No polish, just functional.

---

## Key Decisions (from planning)

| Decision | Choice |
|----------|--------|
| Router | Next.js App Router |
| Data fetching | Server Components query DB directly (no GET /props API route in Phase 1) |
| Auth | URL params only, no localStorage |
| API auth | Query parameters (`?secret=xxx`) |
| Captain auth | Same secret for admin + picks |
| Captain participant | Captain's participant record uses `captain_secret` as its `secret` field |
| Secrets format | UUID (`crypto.randomUUID()`) |
| Duplicate picks | Overwrite existing |
| Pool completion | Auto-complete when prop resolved |
| Status blocking | Block join/picks when pool is `locked` OR `completed` |
| Leaderboard ties | Sort by points DESC, then name ASC (alphabetical) |
| Testing | TDD - tests first |
| Test database | In-memory SQLite (fast, isolated) |
| Schema | Include all fields (future-proof) |
| Invite code collision | Let it fail in Phase 1 (add retry in Phase 3) |
| Props UI | Support displaying multiple props (future-proof) |

---

## Implementation Order

Tasks are ordered by dependencies. Complete each section before moving to the next.

### 1. Project Foundation

#### 1.1 Testing Setup
- [ ] Install Vitest and dependencies
  ```bash
  npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
  ```
- [ ] Create `vitest.config.ts`
- [ ] Add test scripts to `package.json`
- [ ] Create test database helper (`src/lib/test-db.ts`) - uses in-memory SQLite
- [ ] Verify with a trivial test

#### 1.2 CI Pipeline
- [ ] Create `.github/workflows/ci.yml`
- [ ] Configure: lint → typecheck → test → build
- [ ] Push and verify workflow runs

#### 1.3 Turso Database
- [ ] Create Turso account (if needed)
- [ ] Install Turso CLI: `brew install tursodatabase/tap/turso`
- [ ] Create database: `turso db create props-with-pals`
- [ ] Get credentials: `turso db tokens create props-with-pals`
- [ ] Add to `.env.local`:
  ```
  TURSO_DATABASE_URL=libsql://...
  TURSO_AUTH_TOKEN=...
  ```
- [ ] Add `.env.local` to `.gitignore` (if not already)

#### 1.4 Drizzle ORM Setup
- [ ] Install Drizzle dependencies
  ```bash
  npm install drizzle-orm @libsql/client
  npm install -D drizzle-kit
  ```
- [ ] Create `drizzle.config.ts`
- [ ] Create database client (`src/lib/db.ts`)

---

### 2. Database Schema

#### 2.1 Schema Definition
- [ ] Create `src/lib/schema.ts` with all 4 tables:

**Pool**
```typescript
id, name, invite_code, buy_in_amount, captain_name,
captain_secret, status, created_at, updated_at
```

**Prop**
```typescript
id, pool_id, question_text, options (JSON), point_value,
correct_option_index, category, status, order, created_at, updated_at
```

**Participant**
```typescript
id, pool_id, name, secret, total_points, paid, status,
joined_at, updated_at
```

**Pick**
```typescript
id, participant_id, prop_id, selected_option_index,
points_earned, created_at, updated_at
```

#### 2.2 Indexes & Constraints
- [ ] `Pool.invite_code` - unique
- [ ] `Participant(pool_id, name)` - unique composite
- [ ] `Participant(pool_id, secret)` - for auth lookup
- [ ] `Pick(participant_id, prop_id)` - unique composite
- [ ] Foreign keys: Prop→Pool, Participant→Pool, Pick→Participant, Pick→Prop

#### 2.3 Migration
- [ ] Generate migration: `npx drizzle-kit generate`
- [ ] Push to Turso: `npx drizzle-kit push`
- [ ] Verify tables exist

---

### 3. Utility Functions (TDD)

Build and test helper functions before API routes.

#### 3.1 Invite Code Generation
- [ ] Write test: generates 6 chars, only A-Z and 2-9
- [ ] Write test: no ambiguous characters (0, 1, O, I, L)
- [ ] Write test: codes are random (multiple calls differ)
- [ ] Implement `src/lib/invite-code.ts`

#### 3.2 Points Calculation
- [ ] Write test: correct pick earns prop's point_value
- [ ] Write test: incorrect pick earns 0
- [ ] Write test: calculates total across multiple picks
- [ ] Implement `src/lib/points.ts`

#### 3.3 Zod Schemas
- [ ] Create `src/lib/validators.ts`
- [ ] `CreatePoolSchema`: name (1-100), captainName (1-50), buyInAmount (optional)
- [ ] `CreatePropSchema`: questionText, options (2-10 strings), pointValue (positive int)
- [ ] `JoinPoolSchema`: name (1-50)
- [ ] `SubmitPickSchema`: propId (uuid), selectedOptionIndex (non-negative int)
- [ ] `ResolveSchema`: correctOptionIndex (non-negative int)

---

### 4. API Routes (TDD)

For each route: write tests first, then implement.

#### 4.1 Create Pool
`POST /api/pools`

**Tests:**
- [ ] Creates pool with valid input
- [ ] Auto-generates invite code (6 chars)
- [ ] Auto-generates captain_secret (UUID)
- [ ] Auto-adds captain as participant (with `secret = captain_secret`)
- [ ] Sets status to 'open'
- [ ] Returns pool with invite_code and captain_secret
- [ ] Rejects invalid input (missing name, etc.)

**Implementation:**
- [ ] Create `src/app/api/pools/route.ts`
- [ ] Validate input with Zod
- [ ] Generate invite code and captain_secret
- [ ] Insert pool + participant in transaction (participant.secret = captain_secret)
- [ ] Return created pool

#### 4.2 Get Pool
`GET /api/pools/[code]`

**Tests:**
- [ ] Returns pool by invite code
- [ ] Returns 404 for invalid code
- [ ] Does NOT return captain_secret (security)

**Implementation:**
- [ ] Create `src/app/api/pools/[code]/route.ts`
- [ ] Query by invite_code
- [ ] Omit sensitive fields from response

#### 4.3 Lock Pool
`PATCH /api/pools/[code]?secret=...`

**Tests:**
- [ ] Updates status from 'open' to 'locked'
- [ ] Requires captain_secret (via query param)
- [ ] Rejects if wrong secret (401)
- [ ] Rejects if pool not found (404)
- [ ] Rejects if already locked or completed (400)

**Implementation:**
- [ ] Add PATCH handler to `src/app/api/pools/[code]/route.ts`
- [ ] Verify captain_secret
- [ ] Update status

#### 4.4 Create Prop
`POST /api/pools/[code]/props?secret=...`

**Tests:**
- [ ] Creates prop with valid input
- [ ] Requires captain_secret (via query param)
- [ ] Sets order automatically (next available)
- [ ] Sets status to 'active'
- [ ] Rejects if pool is locked or completed (403)
- [ ] Validates options array (2-10 items)

**Implementation:**
- [ ] Create `src/app/api/pools/[code]/props/route.ts`
- [ ] Validate captain auth
- [ ] Check pool status
- [ ] Insert prop

#### 4.5 Resolve Prop
`POST /api/pools/[code]/props/[id]/resolve?secret=...`

**Tests:**
- [ ] Sets correct_option_index on prop
- [ ] Requires captain_secret (via query param)
- [ ] Requires pool to be locked (403 if open or completed)
- [ ] Calculates points_earned for all picks
- [ ] Updates total_points on participants
- [ ] Auto-completes pool (sets status to 'completed')
- [ ] Rejects if already resolved (400)
- [ ] Rejects invalid option index (400)

**Implementation:**
- [ ] Create `src/app/api/pools/[code]/props/[id]/resolve/route.ts`
- [ ] Validate captain auth
- [ ] Check pool is locked
- [ ] Update prop, picks, participants in transaction
- [ ] Set pool to completed

#### 4.6 Join Pool
`POST /api/pools/[code]/join`

**Tests:**
- [ ] Creates participant with name
- [ ] Auto-generates participant secret (UUID)
- [ ] Sets total_points to 0
- [ ] Returns participant with secret
- [ ] Rejects duplicate name (409 NAME_TAKEN)
- [ ] Rejects if pool is locked or completed (403)

**Implementation:**
- [ ] Create `src/app/api/pools/[code]/join/route.ts`
- [ ] Validate name
- [ ] Check pool status
- [ ] Check name uniqueness
- [ ] Insert participant

#### 4.7 Submit Pick
`POST /api/pools/[code]/picks?secret=...`

**Tests:**
- [ ] Creates pick for participant
- [ ] Requires participant secret (via query param)
- [ ] Overwrites existing pick (upsert)
- [ ] Rejects if pool is locked or completed (403)
- [ ] Rejects invalid prop_id (404)
- [ ] Rejects invalid option index (400)

**Implementation:**
- [ ] Create `src/app/api/pools/[code]/picks/route.ts`
- [ ] Validate participant auth
- [ ] Check pool status
- [ ] Upsert pick (insert or update)

#### 4.8 Get Leaderboard
`GET /api/pools/[code]/leaderboard`

**Tests:**
- [ ] Returns participants ranked by total_points DESC, then name ASC (tie-breaker)
- [ ] Includes name and total_points
- [ ] Does NOT include secrets
- [ ] Works for any pool status

**Implementation:**
- [ ] Create `src/app/api/pools/[code]/leaderboard/route.ts`
- [ ] Query participants ordered by total_points DESC, name ASC

---

### 5. UI Pages (Basic)

Minimal functional UI. No styling beyond Tailwind defaults.

#### 5.1 Home / Create Pool
`/` or `/create`

- [ ] Form: pool name, captain name
- [ ] Submit → POST /api/pools
- [ ] On success → redirect to captain dashboard with secret in URL

#### 5.2 Captain Dashboard
`/pool/[code]/captain?secret=...`

- [ ] Display pool info (name, status, invite code)
- [ ] "Add Prop" form (question, options, points)
- [ ] Display existing prop(s)
- [ ] "Lock Pool" button (when open)
- [ ] "Mark Correct Answer" UI (when locked)
- [ ] Show captain's own picks (using captain_secret to auth as participant)
- [ ] Link to leaderboard

#### 5.3 Join Pool
`/pool/[code]`

- [ ] Show pool name
- [ ] Form: enter your name
- [ ] Submit → POST /api/pools/[code]/join
- [ ] On success → redirect to participant view with secret in URL

#### 5.4 Participant View
`/pool/[code]/picks?secret=...`

- [ ] Display prop with options
- [ ] Select option → POST /api/pools/[code]/picks
- [ ] Show current selection
- [ ] "Pool is locked" message when applicable
- [ ] Link to leaderboard

#### 5.5 Leaderboard
`/pool/[code]/leaderboard`

- [ ] Display ranked list of participants
- [ ] Show name and total_points
- [ ] Highlight winner (if completed)

---

### 6. Deploy

#### 6.1 Vercel Setup
- [ ] Connect GitHub repo to Vercel
- [ ] Add environment variables (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)
- [ ] Deploy

#### 6.2 Verify Production
- [ ] Complete full flow on production:
  1. Create pool
  2. Add prop
  3. Share invite code
  4. Join as participant
  5. Submit pick
  6. Lock pool
  7. Mark correct answer
  8. View leaderboard

---

## Exit Criteria

- [ ] All tests passing (green CI)
- [ ] Can complete full flow: create → join → pick → resolve → leaderboard
- [ ] Deployed to Vercel and working in production

---

## Files to Create

```
src/
├── app/
│   ├── api/
│   │   └── pools/
│   │       ├── route.ts                    # POST create pool
│   │       └── [code]/
│   │           ├── route.ts                # GET pool, PATCH lock
│   │           ├── props/
│   │           │   ├── route.ts            # POST create prop
│   │           │   └── [id]/
│   │           │       └── resolve/
│   │           │           └── route.ts    # POST resolve
│   │           ├── join/
│   │           │   └── route.ts            # POST join
│   │           ├── picks/
│   │           │   └── route.ts            # POST submit pick
│   │           └── leaderboard/
│   │               └── route.ts            # GET leaderboard
│   ├── page.tsx                            # Home / create pool
│   └── pool/
│       └── [code]/
│           ├── page.tsx                    # Join pool
│           ├── captain/
│           │   └── page.tsx                # Captain dashboard
│           ├── picks/
│           │   └── page.tsx                # Participant view
│           └── leaderboard/
│               └── page.tsx                # Leaderboard
├── lib/
│   ├── db.ts                               # Database client (Turso)
│   ├── test-db.ts                          # Test database (in-memory SQLite)
│   ├── schema.ts                           # Drizzle schema
│   ├── invite-code.ts                      # Invite code generator
│   ├── invite-code.test.ts
│   ├── points.ts                           # Points calculation
│   ├── points.test.ts
│   └── validators.ts                       # Zod schemas
├── .env.local                              # Environment variables
├── drizzle.config.ts                       # Drizzle configuration
└── vitest.config.ts                        # Vitest configuration
```

---

## Notes

- **TDD Flow**: For each feature, write failing tests → implement → tests pass → refactor
- **No styling**: Use default Tailwind. Polish comes in Phase 3.
- **Manual refresh**: No polling. Users refresh page to see updates.
- **URL params only**: Secrets in URL, not localStorage. Captain must save their URL.
- **Server Components**: Pages fetch data directly from DB. No separate GET /props API route needed.
- **Captain as participant**: Captain's participant record has `secret = captain_secret` (one secret for everything).
- **API auth**: All authenticated routes use `?secret=xxx` query parameter.
- **Phase 3 backlog**: Add invite code collision retry logic.
