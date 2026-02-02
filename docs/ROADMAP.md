# Roadmap: Props-With-Pals

> Last updated: February 2026

## Current Status

**Phase**: Vertical Slice
**Focus**: Build minimal end-to-end flow to prove the system works

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

## Phase 1: Vertical Slice (Current)

**Goal**: Prove the full flow works end-to-end with minimal features

One captain, one participant, one prop, one pick → score calculated. No polish, just functional.

### Build Fully (no shortcuts - avoiding rework later)

- [ ] Full database schema (all 4 tables, all fields from DATA-MODEL.md)
- [ ] Secret-based auth (captain_secret, participant.secret)
- [ ] Captain auto-added as participant on pool creation
- [ ] Invite code generation (A-Z, 2-9, 6 chars)
- [ ] Points calculation when marking correct answer
- [ ] API route structure (`/api/pools/...` - final naming)
- [ ] Unique participant names per pool constraint

### Simplify (will enhance in Phase 2)

- [ ] Pool starts in `open` status (skip `draft` for now)
- [ ] No localStorage persistence (URL params only)
- [ ] Manual page refresh (no polling)
- [ ] Minimal error messages
- [ ] Basic UI (functional, not styled)

### Captain Flow

- [ ] Create pool (name + captain name, auto-generate invite code)
- [ ] Add one prop (question, 2-10 options, point value)
- [ ] Lock pool (open → locked)
- [ ] Mark correct answer
- [ ] See final scores

### Participant Flow

- [ ] Join pool with invite code + name
- [ ] See the prop
- [ ] Submit pick
- [ ] See leaderboard after results

### Technical

- [ ] Vitest setup and configuration
- [ ] GitHub Actions CI (lint, typecheck, test, build)
- [ ] Turso database setup (Drizzle ORM)
- [ ] Database schema for Pool, Prop, Participant, Pick (all fields from DATA-MODEL.md)
- [ ] Core API routes with tests (TDD):
  - [ ] `POST /api/pools` - create pool
  - [ ] `GET /api/pools/[code]` - get pool
  - [ ] `PATCH /api/pools/[code]` - update pool status (lock)
  - [ ] `POST /api/pools/[code]/props` - create prop
  - [ ] `POST /api/pools/[code]/props/[id]/resolve` - mark correct answer
  - [ ] `POST /api/pools/[code]/join` - join as participant
  - [ ] `POST /api/pools/[code]/picks` - submit pick (overwrites existing)
  - [ ] `GET /api/pools/[code]/leaderboard` - get ranked participants
- [ ] Basic UI pages (create, captain view, join, participant view, leaderboard)
- [ ] Deploy to Vercel

**Exit Criteria**: Complete one full flow manually - create pool, join, pick, score, see leaderboard. All tests passing.

---

## Phase 2: MVP Core

**Goal**: Run a complete prop bet pool for a single event

### Captain Features

- [ ] Edit pool details (name, buy-in amount)
- [ ] Add multiple props
- [ ] Edit/delete props before lock
- [ ] Pool status flow (draft → open → locked → completed)
- [ ] View all participants
- [ ] Mark multiple props as correct
- [ ] View detailed leaderboard
- [ ] Pool description
- [ ] Update navigation

### Participant Features

- [ ] View all props with point values
- [ ] Submit picks for all props
- [ ] View my picks
- [ ] View leaderboard with rankings
- [ ] TBD

### Security

- [ ] Migrate from URL query param secrets to HTTP-only cookies or Authorization headers
  - Current: `?secret=xxx` leaks to browser history, server logs, referer headers
  - Target: Secure cookie-based session or Bearer token auth
- [ ] Add CSRF protection for all state-changing operations (POST/PATCH)
  - Consider NextAuth.js or similar for proper session management

### Technical

- [ ] Remaining API routes from technical-considerations.md
- [ ] Mobile-responsive UI (Tailwind)
- [ ] React Query for data fetching with polling (10s interval)
- [ ] localStorage for user persistence (secrets, preferences)
- [ ] Comprehensive error handling
- [ ] Loading states

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

### Technical

- [ ] E2E tests (Playwright) - critical user flows
- [ ] Distributed rate limiting (Upstash Redis)
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
