# Roadmap: Props-With-Pals

> Last updated: February 2026

## Current Status

**Phase**: Project Setup
**Focus**: Documentation and planning complete, ready to build

---

## Phase 0: Setup (Current)

**Goal**: Project foundation and planning

- [x] Initialize Next.js project with TypeScript + Tailwind
- [x] Create documentation structure
- [x] Define product vision
- [x] Draft data model
- [x] Establish design principles
- [ ] Finalize data model
- [ ] Choose database library

**Exit Criteria**: Data model finalized, ready to build first feature

---

## Phase 1: MVP Core

**Goal**: Run a complete prop bet pool for a single event

### Captain Features

- [ ] Create pool (name, buy-in, invite code)
- [ ] Add prop bets (question, options, points)
- [ ] Edit/delete props before lock
- [ ] View participants
- [ ] Lock betting
- [ ] Mark correct answers
- [ ] View leaderboard

### Participant Features

- [ ] Join pool with invite code + name
- [ ] View all props
- [ ] Submit picks
- [ ] View my picks
- [ ] View leaderboard

### Technical

- [ ] SQLite database setup
- [ ] API routes for all operations
- [ ] Mobile-responsive UI
- [ ] Real-time leaderboard updates (polling)

**Exit Criteria**: Successfully run a prop bet pool with 5+ friends

---

## Phase 2: Polish

**Goal**: Improve based on MVP learnings

### Potential Features

- [ ] Edit picks before lock
- [ ] Prop categories/sections
- [ ] Pool settings (lock time, visibility)
- [ ] Shareable results image
- [ ] Better error handling
- [ ] Loading states
- [ ] Tiebreaker questions
- [ ] Track payments
- [ ] Captains can remove props or mark them as null
- [ ] Captains can remove participants

**Exit Criteria**: Smooth, polished experience for casual use

---

## Phase 3: Extended Features

**Goal**: Support more use cases

### Potential Features

- [ ] Pool history (view past pools)
- [ ] Pool templates (reuse props)
- [ ] Multi-game pools (playoffs, tournaments)
- [ ] Push notifications
- [ ] PWA support (installable)

**Exit Criteria**: Flexible enough for different event types

---

## Future Considerations

Not planned, but might explore:

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

| Date        | Decision           | Rationale                                    |
| ----------- | ------------------ | -------------------------------------------- |
| Feb 1, 2026 | Next.js + SQLite   | Simple, works anywhere, no external services |
| Feb 1, 2026 | No accounts        | Invite codes reduce friction                 |
| Feb 1, 2026 | Manual score entry | Keep it simple, captain controls everything  |

---

**Next Step**: Finalize data model, then build pool creation
