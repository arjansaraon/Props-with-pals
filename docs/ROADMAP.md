# Roadmap: Props-With-Pals

> Last updated: February 14, 2026

## Current Status

**Phase**: Polish (Phase 3)
**Focus**: Real-user testing, UX polish, deploy to production

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
- [x] Deploy to Vercel

**Exit Criteria**: Complete one full flow manually - create pool, join, pick, score, see leaderboard. All tests passing.

---

## Phase 2: MVP Core (Complete)

**Goal**: Run a complete prop bet pool for a single event

### Backend

- [x] Edit pool details (name, description)
- [x] Add multiple props
- [x] Edit/delete props before lock
- [x] Pool status flow (draft → open → locked → completed)
- [x] View all participants (`GET /api/pools/[code]/players`)
- [x] Mark multiple props as correct
- [x] View detailed leaderboard
- [x] Pool description field
- [x] View all props with point values
- [x] Submit picks for all props
- [x] View my picks
- [x] View leaderboard with rankings
- [x] Backend API routes complete (321 tests passing)
- [x] Shared API helpers (`getPoolWithAuth`, `toPublicPool`)
- [x] Zod validators for all mutations
- [x] Prop reorder with drag-and-drop (`POST /api/pools/[code]/props/reorder`)
- [x] Pick popularity stats (`GET /api/pools/[code]/props/[id]/picks-count`)

### Security

- [x] Migrate from URL query param secrets to HTTP-only cookies
  - Cookie-based auth with 30-day sliding window
  - Secrets never exposed in URLs or JavaScript
- [x] Add CSRF protection for all state-changing operations (POST/PATCH/DELETE)
  - Origin header validation
- [x] Recovery tokens for fallback auth when cookies unavailable
  - `POST /api/pools/[code]/recover`

### Frontend

- [x] Remove secrets from URLs (cookie-only auth)
- [x] localStorage for user metadata (name, isCaptain flag)
  - NOT for secrets (httpOnly cookies handle auth)
  - Enables "returning user" experience
- [x] Captain 3-tab interface (Admin / My Picks / Players)
  - Captain can switch between managing pool, making picks, and viewing players
- [x] Toast notifications via sonner (success/error feedback)
- [x] Mobile-responsive layout (full-width inputs/buttons, 44px+ touch targets)
- [x] Loading states (spinners on buttons, skeleton loaders for pages)
- [x] Inline error handling and validation messages
- [x] Prop categories (e.g., "1st Quarter", "2nd Quarter")
- [x] Drag-and-drop prop reordering with visual feedback
- [x] Collapsible "Add New Prop" form
- [x] Pick popularity (see how many players selected each option)
- [x] Player picks view (see what each participant picked, after lock)
- [x] RecoveryHandler component for token-based auth fallback
- [x] Share buttons for invite code
- [x] Full shadcn/ui component library

**Exit Criteria**: Successfully run a prop bet pool with 5+ friends

---

## Phase 3: Polish (Current)

**Goal**: Test with real users, fix issues, deploy to production

### Deploy & Test

- [x] Deploy to Vercel
- [ ] Run a real pool with 5+ friends
- [ ] Collect UX feedback from real users

### Pre-Launch Fixes

- [ ] Add confirmation dialogs for destructive actions (lock pool, mark correct, delete prop)
- [ ] Add basic auto-refresh on leaderboard page (`setInterval` + `router.refresh()`)
- [ ] Show captain recovery URL prominently on pool creation success screen
- [ ] Clarify draft vs open status (docs say draft→open, but pools create as open — resolve inconsistency)
- [ ] Verify player picks view is gated by pool status (no peeking before lock)

### UX Polish

- [ ] Review and refine create pool flow
- [ ] Review and refine join pool flow
- [ ] Verify participant returning-user experience (localStorage + cookies)
- [ ] Mobile device testing (real devices, not just responsive mode)

### Code Quality

- [ ] Break down files that are too large (300-line guideline)
- [ ] Security review
- [ ] Code review pass
- [ ] E2E tests for critical flows (Playwright)

**Exit Criteria**: Smooth, polished experience validated by real users

---

## Phase 4: Features & Infrastructure

**Goal**: Add features based on real-user feedback, harden infrastructure

### Data Fetching & UX

- [ ] React Query for data fetching (caching, automatic refetching, polling)
- [ ] Skeleton loading states (replace spinners)
- [ ] Confirmation modals (lock pool, mark correct, delete prop)
- [ ] Smart routing based on localStorage
  - `/pool/{code}` auto-redirects to captain/picks view if user has saved session
- [ ] Celebratory feedback (Duolingo-style animations for correct picks)

### Features

- [ ] Edit picks before lock
- [ ] "Spreadsheet" view (all players × all props grid)
- [ ] Tiebreaker questions
- [ ] Track payments (buy-in, paid status)
- [ ] Captains can void/nullify props
- [ ] Captains can remove participants

### Data Integrity & UX

- [ ] Guard prop option edits when picks exist (block or cascade-delete with warning)
- [ ] Batch pick submission endpoint (or progress indicator for sequential saves)
- [ ] Cross-device session transfer ("send login link to myself" flow)
- [ ] Auto-prompt "mark pool complete" when all props are resolved
- [ ] Verify invite code collision handling for auto-generated codes

### Infrastructure

- [ ] Rate limiting (Upstash Redis or similar)
  - Priority: `/api/pools` (creation), `/api/pools/[code]/join` (joining)
- [ ] Error tracking (Sentry)

**Exit Criteria**: Full-fledged pool app hardened for wider use

---

## Phase 5: Extended Features

**Goal**: Support more use cases and platforms

### Features

- [ ] Pool settings (scheduled lock time, visibility)
- [ ] Shareable results image
- [ ] Real-time updates via Server-Sent Events (SSE)
- [ ] Dark mode support
- [ ] Pick history / audit trail
- [ ] Pool history (view past pools)
- [ ] Pool templates (reuse props)
- [ ] Multi-game pools (playoffs, tournaments)
- [ ] Push notifications
- [ ] PWA support (installable)
- [ ] User accounts (optional, for pool history across devices)

### Technical

- [ ] Offline pick queuing (submit when back online)
- [ ] Uptime monitoring (Checkly or similar)
- [ ] Pagination for leaderboard, players, and props lists
- [ ] Cookie expiry warning (notify before 30-day window lapses)
- [ ] Name reservation / verification for participants

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

| Date        | Decision                                | Rationale                                                              |
| ----------- | --------------------------------------- | ---------------------------------------------------------------------- |
| Feb 1, 2026 | Next.js App Router                      | Server Components for bundle size, modern patterns                     |
| Feb 1, 2026 | No accounts                             | Invite codes reduce friction                                           |
| Feb 1, 2026 | Manual score entry                      | Keep it simple, captain controls everything                            |
| Feb 1, 2026 | Unique names per pool                   | Avoid confusion, simple error message                                  |
| Feb 1, 2026 | Auto-add captain as participant         | Simplest option, captain can play                                      |
| Feb 1, 2026 | Captain uses same secret for both roles | One URL to save, simpler UX                                            |
| Feb 1, 2026 | Invite code: A-Z, 2-9                   | No ambiguous chars (0/O/1/I/L), easy to read                           |
| Feb 1, 2026 | Secrets use UUID format                 | Consistent with entity IDs, easy to generate                           |
| Feb 1, 2026 | Vercel + Turso                          | Easiest deploy, free tier, serverless-native                           |
| Feb 1, 2026 | Drizzle ORM                             | TypeScript-first, works with Turso                                     |
| Feb 1, 2026 | API routes: plural RESTful              | Industry standard, future-proof                                        |
| Feb 1, 2026 | Dedicated `/resolve` endpoint           | Clear intent, handles side effects explicitly                          |
| Feb 1, 2026 | Duplicate picks overwrite               | Allows changing mind before lock, simpler UX                           |
| Feb 1, 2026 | Pool auto-completes on resolve          | Phase 1 has one prop, simplest flow                                    |
| Feb 1, 2026 | URL params only (no localStorage)       | Phase 1 simplicity, captain saves their URL                            |
| Feb 1, 2026 | Response format: direct + HTTP          | Simpler error handling via status codes                                |
| Feb 1, 2026 | Zod for validation                      | Types + runtime validation in one definition                           |
| Feb 1, 2026 | Server Components + fetch               | Phase 1 simplicity, add React Query in Phase 2                         |
| Feb 1, 2026 | TDD approach                            | Tests first, full CI from start                                        |
| Feb 1, 2026 | Include all schema fields               | Future-proof, avoid migrations later                                   |
| Feb 2, 2026 | HttpOnly cookies for auth               | Secrets never exposed to JS, secure by default                         |
| Feb 2, 2026 | Origin header CSRF protection           | Simple, effective, no token management needed                          |
| Feb 2, 2026 | Draft status for pools                  | Captain preps pool before opening to participants                      |
| Feb 2, 2026 | Shared API helpers (`getPoolWithAuth`)  | Reduce duplication, consistent auth/error handling                     |
| Feb 2, 2026 | localStorage for metadata only          | Secrets stay in httpOnly cookies; localStorage for name/isCaptain flag |
| Feb 2, 2026 | Defer React Query to Phase 4            | Manual fetch sufficient for MVP; avoid complexity                      |
| Feb 2, 2026 | Simple spinners over skeletons          | Faster to implement; skeletons deferred to Phase 4                     |
| Feb 5, 2026 | Recovery tokens for fallback auth       | Users without cookie support can still authenticate                    |
| Feb 8, 2026 | Pick popularity stats in Phase 2        | Adds value with low effort; useful for engagement                      |
| Feb 8, 2026 | Player picks view in Phase 2            | Natural extension of leaderboard; players want to compare picks        |
| Feb 14, 2026 | 3-tab captain interface (Admin/Picks/Players) | Players tab gives captain quick access to participant management  |
| Feb 14, 2026 | Interface design refresh                | Refined shadows, typography, leaderboard styling for polish            |
| Feb 14, 2026 | Document blind spots in roadmap         | 14 gaps identified during doc review; prioritized across Phase 3-5     |
