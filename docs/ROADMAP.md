# Roadmap: Props-With-Pals

> Last updated: February 2026

## Current Status

**Phase**: MVP Core (Phase 2)
**Focus**: Backend API complete, ready for frontend updates

---

## Phase 0: Setup (Complete)

**Goal**: Project foundation and planning

- [x] Initialize Next.js project with TypeScript + Tailwind
- [x] Create documentation structure
- [x] Define product vision
- [x] Draft data model
- [x] Establish design principles
- [x] Finalize data model
- [x] Choose database library (Drizzle + Turso)

**Exit Criteria**: Data model finalized, ready to build first feature ✅

---

## Phase 1: Vertical Slice (Complete)

**Goal**: Prove the full flow works end-to-end with minimal features

One captain, one participant, one prop, one pick → score calculated. No polish, just functional.

### Build Fully (no shortcuts - avoiding rework later)

- [x] Full database schema (all 4 tables, all fields from DATA-MODEL.md)
- [x] Secret-based auth (captain_secret, participant.secret)
- [x] Captain auto-added as participant on pool creation
- [x] Invite code generation (A-Z, 2-9, 6 chars)
- [x] Points calculation when marking correct answer
- [x] API route structure (`/api/pools/...` - final naming)
- [x] Unique participant names per pool constraint

### Simplify (will enhance in Phase 2)

- [x] Pool starts in `open` status (skip `draft` for now)
- [x] No localStorage persistence (URL params only)
- [x] Manual page refresh (no polling)
- [x] Minimal error messages
- [x] Basic UI (functional, not styled)

### Captain Flow

- [x] Create pool (name + captain name, auto-generate invite code)
- [x] Add one prop (question, 2-10 options, point value)
- [x] Lock pool (open → locked)
- [x] Mark correct answer
- [x] See final scores

### Participant Flow

- [x] Join pool with invite code + name
- [x] See the prop
- [x] Submit pick
- [x] See leaderboard after results

### Technical

- [x] Vitest setup and configuration
- [x] GitHub Actions CI (lint, typecheck, test, build)
- [x] Turso database setup (Drizzle ORM)
- [x] Database schema for Pool, Prop, Participant, Pick (all fields from DATA-MODEL.md)
- [x] Core API routes with tests (TDD):
  - [x] `POST /api/pools` - create pool
  - [x] `GET /api/pools/[code]` - get pool
  - [x] `PATCH /api/pools/[code]` - update pool status (lock)
  - [x] `POST /api/pools/[code]/props` - create prop
  - [x] `POST /api/pools/[code]/props/[id]/resolve` - mark correct answer
  - [x] `POST /api/pools/[code]/join` - join as participant
  - [x] `POST /api/pools/[code]/picks` - submit pick (overwrites existing)
  - [x] `GET /api/pools/[code]/leaderboard` - get ranked participants
- [x] Basic UI pages (create, captain view, join, participant view, leaderboard)
- [ ] Deploy to Vercel

**Exit Criteria**: Complete one full flow manually - create pool, join, pick, score, see leaderboard. All tests passing.

---

## Phase 2: MVP Core (Current)

**Goal**: Run a complete prop bet pool for a single event

### Captain Features

- [x] Edit pool details (name, description)
- [x] Add multiple props
- [x] Edit/delete props before lock
- [x] Pool status flow (draft → open → locked → completed)
- [x] View all participants (`GET /api/pools/[code]/participants`)
- [x] Mark multiple props as correct
- [x] View detailed leaderboard
- [x] Pool description field
- [ ] Update navigation (frontend)

### Participant Features

- [x] View all props with point values (API ready)
- [x] Submit picks for all props (API ready)
- [x] View my picks (API ready)
- [x] View leaderboard with rankings (API ready)
- [ ] TBD clean up the UI (frontend)
- [ ] More fun color scheme (frontend)

### Security

- [x] Migrate from URL query param secrets to HTTP-only cookies
  - Implemented: Cookie-based auth with 30-day sliding window
  - Backward compatible: Query params still work during migration
- [x] Add CSRF protection for all state-changing operations (POST/PATCH/DELETE)
  - Implemented: Origin header validation

### Technical

- [x] Backend API routes complete (176 tests passing)
- [x] Shared API helpers (`getPoolWithAuth`, `toPublicPool`)
- [x] Zod validators for all mutations
- [ ] Update client components to use cookie auth (frontend)
- [ ] Mobile-responsive UI (Tailwind) (frontend)
- [ ] React Query for data fetching with polling (frontend)
- [ ] localStorage for user preferences (frontend)
- [ ] Comprehensive error handling (frontend)
- [ ] Loading states (frontend)

**Exit Criteria**: Successfully run a prop bet pool with 5+ friends

---

## Phase 3: Polish

**Goal**: Improve based on MVP learnings

### Potential Features

- [ ] Edit picks before lock
- [ ] View other players' picks (after lock)
- [ ] Easy share link (tap to copy participant's unique URL)
- [ ] Prop categories/sections
- [ ] Pool settings (lock time, visibility)
- [ ] Shareable results image
- [ ] Better error handling
- [ ] Loading states
- [ ] Tiebreaker questions
- [ ] Track payments
- [ ] Captains can remove props or mark them as null
- [ ] Captains can remove participants
- [ ] Save things in 'draft' for captain

### Technical

- [ ] E2E tests (Playwright) - critical user flows
- [ ] Rate limiting (Upstash Redis or similar)
  - Priority: `/api/pools` (creation), `/api/pools/[code]/join` (joining)
  - Prevents abuse before going public
- [ ] Error tracking (Sentry)

**Exit Criteria**: Smooth, polished experience for casual use

---

## Phase 4: Extended Features

**Goal**: Support more use cases

### Potential Features

- [ ] Real-time updates via Server-Sent Events (SSE) - replace polling
- [ ] Dark mode support
- [ ] Pick history / audit trail (see when picks were made/changed, locked after pool lock)
- [ ] Pool history (view past pools)
- [ ] Pool templates (reuse props)
- [ ] Multi-game pools (playoffs, tournaments)
- [ ] Push notifications
- [ ] PWA support (installable)
- [ ] Create account
- [ ] View other people's pools

### Technical

- [ ] Offline pick queuing (submit when back online)
- [ ] Uptime monitoring (Checkly or similar)

**Exit Criteria**: Flexible enough for different event types

---

## Future Considerations

Not planned, but might explore:

- Pool deletion (soft delete)
- Multiple captains per pool
- Recurring pools (weekly picks)
- Points multipliers
- Custom scoring rules
- Social sharing features
- Analytics/stats
- Partial points (closest number)
- Venmo integration

---

## Decisions Log

Track key decisions as we make them:

| Date        | Decision                                | Rationale                                          |
| ----------- | --------------------------------------- | -------------------------------------------------- |
| Feb 1, 2026 | Next.js App Router                      | Server Components for bundle size, modern patterns |
| Feb 1, 2026 | No accounts                             | Invite codes reduce friction                       |
| Feb 1, 2026 | Manual score entry                      | Keep it simple, captain controls everything        |
| Feb 1, 2026 | Unique names per pool                   | Avoid confusion, simple error message              |
| Feb 1, 2026 | Auto-add captain as participant         | Simplest option, captain can play                  |
| Feb 1, 2026 | Captain uses same secret for both roles | One URL to save, simpler UX                        |
| Feb 1, 2026 | Invite code: A-Z, 2-9                   | No ambiguous chars (0/O/1/I/L), easy to read       |
| Feb 1, 2026 | Secrets use UUID format                 | Consistent with entity IDs, easy to generate       |
| Feb 1, 2026 | Vercel + Turso                          | Easiest deploy, free tier, serverless-native       |
| Feb 1, 2026 | Drizzle ORM                             | TypeScript-first, works with Turso                 |
| Feb 1, 2026 | API routes: plural RESTful              | Industry standard, future-proof                    |
| Feb 1, 2026 | Dedicated `/resolve` endpoint           | Clear intent, handles side effects explicitly      |
| Feb 1, 2026 | Duplicate picks overwrite               | Allows changing mind before lock, simpler UX       |
| Feb 1, 2026 | Pool auto-completes on resolve          | Phase 1 has one prop, simplest flow                |
| Feb 1, 2026 | URL params only (no localStorage)       | Phase 1 simplicity, captain saves their URL        |
| Feb 1, 2026 | Response format: direct + HTTP          | Simpler error handling via status codes            |
| Feb 1, 2026 | Zod for validation                      | Types + runtime validation in one definition       |
| Feb 1, 2026 | Server Components + fetch               | Phase 1 simplicity, add React Query in Phase 2     |
| Feb 1, 2026 | TDD approach                            | Tests first, full CI from start                    |
| Feb 1, 2026 | Include all schema fields               | Future-proof, avoid migrations later               |
| Feb 2, 2026 | HttpOnly cookies for auth               | Secrets never exposed to JS, secure by default     |
| Feb 2, 2026 | Origin header CSRF protection           | Simple, effective, no token management needed      |
| Feb 2, 2026 | Draft status for pools                  | Captain preps pool before opening to participants  |
| Feb 2, 2026 | Shared API helpers (`getPoolWithAuth`)  | Reduce duplication, consistent auth/error handling |
