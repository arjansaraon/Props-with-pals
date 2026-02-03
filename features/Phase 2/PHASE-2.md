# Phase 2: MVP Core

> **Goal**: Run a complete prop bet pool for a single event
>
> **Exit Criteria**: Successfully run a prop bet pool with 5+ friends

---

## Overview

Phase 2 transforms the vertical slice into a usable MVP. Key themes:

1. **Multi-prop support** - Multiple props per pool with full CRUD
2. **Better UX** - Loading states, error handling, responsive design
3. **Security hardening** - Move secrets out of URLs
4. **Real-time feel** - Polling for live updates

---

## Feature Breakdown

### Captain Features

| Feature | Complexity | Status | Notes |
|---------|------------|--------|-------|
| Edit pool details | Low | TODO | PATCH existing endpoint |
| Add multiple props | Low | TODO | Already supported, just UI |
| Edit props (text only after open) | Medium | TODO | New endpoint, text-only in open status |
| Delete props (draft only) | Medium | TODO | Hard delete, only allowed in draft |
| Pool status: draft → open | Medium | TODO | New state, UI changes |
| View all participants | Low | TODO | New endpoint or extend GET pool |
| Pool description field | Low | TODO | Schema + UI |
| Navigation improvements | Low | TODO | Breadcrumbs, back buttons |

### Participant Features

| Feature | Complexity | Status | Notes |
|---------|------------|--------|-------|
| View all props | Low | TODO | Already works |
| Submit picks for all props | Low | TODO | Loop through props |
| View my picks | Low | TODO | Filter picks by participant |
| View leaderboard | Low | TODO | Already implemented |
| UI polish | Medium | TODO | Colors, spacing, typography |

### Security

| Feature | Complexity | Status | Notes |
|---------|------------|--------|-------|
| Cookie-based auth | **High** | TODO | [See detailed doc](AUTH-MIGRATION.md) |
| CSRF protection | Medium | TODO | Depends on auth approach |

### Technical Infrastructure

| Feature | Complexity | Status | Notes |
|---------|------------|--------|-------|
| React Query + polling | **High** | TODO | [See detailed doc](DATA-FETCHING.md) |
| localStorage persistence | Low | TODO | Store secret after join |
| Mobile-responsive UI | Medium | TODO | Tailwind breakpoints |
| Comprehensive error handling | Medium | TODO | Toasts for errors + form submissions |
| Loading states | Low | TODO | Skeleton loaders |

---

## Decisions (Confirmed)

### Authentication & Security

1. **Auth method:** HttpOnly cookies
   - Most secure for browser apps
   - Secrets never exposed to JavaScript
   - Will need CSRF protection (Origin header check)

2. **Session duration:** 30 days
   - Long enough for multi-day/week events
   - Avoids re-auth complexity (no recovery flow needed for MVP)

3. **Multiple pools:** Yes
   - Store map of `inviteCode -> secret` in cookie
   - User can participate in multiple pools simultaneously

### Pool Management

4. **Draft state:** Yes, `draft` → `open` → `locked` → `completed`
   - Draft: Captain adds/edits props, no participants can join
   - Open: Participants join and pick, no prop changes
   - Captain must explicitly open pool when ready

5. **Prop deletion:** Hard delete (in draft only)
   - Simple, clean - removes prop completely
   - Can add undo/trash feature later if needed
   - Not allowed after pool is open

6. **Prop editing after open:** Text-only edits allowed
   - Can fix typos in question text
   - Cannot change options (would invalidate picks)
   - Cannot edit after pool is locked

### UX Decisions

7. **Pick submission feedback:**
   - Single pick: Optimistic update + subtle checkmark
   - Full form submit: Celebratory toast notification
   - Different feedback for different interaction patterns

8. **Polling intervals:**
   - Leaderboard: 10 seconds (need live scores)
   - Other pages: 30 seconds (lighter server load)
   - Stop polling when pool is completed

9. **Visual style:** Dark + vibrant accents
   - Dark background for comfortable viewing
   - Primary accent: Purple (#8B5CF6)
   - Modern, energetic feel

10. **Toast library:** sonner
    - Lightweight, great defaults, easy API

11. **Minimum props to open pool:** At least 1 required
    - Prevents confusing empty pool state

12. **Invite code in draft:** Yes, visible
    - Captain can prep invite message before opening

---

## Complex Features (Separate Docs)

These features are complex enough to warrant their own design docs:

1. **[Auth Migration](AUTH-MIGRATION.md)** - Moving from URL params to secure cookies
2. **[Data Fetching](DATA-FETCHING.md)** - React Query setup with polling
3. **[Pool Status Flow](POOL-STATUS-FLOW.md)** - Draft state and transitions

---

## Implementation Order (Suggested)

### Week 1: Foundation
1. Auth migration (unblocks everything else)
2. localStorage for secrets
3. React Query setup

### Week 2: Captain Polish
4. Draft status + transitions
5. Edit/delete props
6. Pool description
7. View participants

### Week 3: Participant Polish
8. UI improvements (colors, responsive)
9. Loading states
10. Error handling
11. Pick confirmation UX

### Week 4: Final Polish
12. Navigation improvements
13. Mobile testing
14. Bug fixes
15. Real user testing

---

## Dependencies

```
Auth Migration ──┬──> localStorage persistence
                 │
                 └──> React Query (needs auth context)
                            │
                            └──> Polling

Draft Status ────> Edit/Delete Props (need to know when allowed)

UI Polish ───────> Loading States (need design system first)
```

---

## API Changes Needed

### New Endpoints
- `PATCH /api/pools/[code]/props/[id]` - Edit prop
- `DELETE /api/pools/[code]/props/[id]` - Delete prop
- `GET /api/pools/[code]/participants` - List participants (or extend GET pool)

### Modified Endpoints
- `POST /api/pools` - Add description field
- `PATCH /api/pools/[code]` - Support draft→open transition, edit name/description
- All endpoints - Accept auth via cookie instead of query param

### Schema Changes
- `pools.description` - Optional text field
- No changes needed for prop deletion (hard delete, not soft delete)

---

## Questions for Review

All key decisions confirmed:

1. [x] Auth approach → HttpOnly cookies, 30-day sessions
2. [x] Draft state behavior → draft → open → locked flow
3. [x] Prop edit/delete rules → Hard delete in draft, text-only edit after open
4. [x] Color scheme direction → Dark + vibrant accents
5. [x] Polling intervals → 10s leaderboard, 30s elsewhere

---

*Last updated: February 2026*
