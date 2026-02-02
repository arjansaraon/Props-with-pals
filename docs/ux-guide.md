# UX Guide: Props-With-Pals

Patterns and guidelines for consistent user experience.

> **Note**: This guide describes the full product vision. Features are implemented across phases—see [ROADMAP.md](ROADMAP.md) for what's included in each phase.

## URL Routes & Smart Links

### Routes
```
/                           → Home (create or join)
/pool/{code}                → Smart routing (see below)
/pool/{code}/captain        → Captain dashboard (?secret= in URL)
/pool/{code}/picks          → Participant picks (?secret= in URL)
/pool/{code}/leaderboard    → Public leaderboard
```

### Smart Link Behavior
When user visits `/pool/{code}`:
1. Check localStorage for saved secret for this pool
2. If found → redirect to their view (captain or participant)
3. If not found → show join form (or pool info if locked)

---

## User Persistence

### How Users Stay Logged In
Store secrets in **localStorage** keyed by pool invite code:
```javascript
{
  "pwp_ABC123": { "secret": "xxx", "name": "Mike", "is_captain": false },
  "pwp_XYZ789": { "secret": "yyy", "name": "Arjan", "is_captain": true }
}
```

### Returning User Flow
1. User clicks link or enters code
2. App checks localStorage for that pool
3. If found: auto-authenticate, go to their view
4. If not found: show join form

### Lost Access
- **Participants**: Captain can share their unique link (Phase 3: easy share button)
- **Captain**: Link saved in browser; if lost, no recovery (MVP)

---

## Navigation Structure

### Captain Views
Captain has a **tab toggle** at top:
```
┌─────────────────────────────────┐
│  [Admin]  [My Picks]            │
├─────────────────────────────────┤
│  (content changes based on tab) │
└─────────────────────────────────┘

Admin tab:
  ├── Pool Dashboard
  ├── Edit Props
  ├── View Participants
  └── Mark Results

My Picks tab:
  └── Same as participant view
```

### Participant Views
```
Home → Join Pool → My Picks → Leaderboard
```

---

## Key Screens

### 1. Home Screen

**Purpose**: Entry point - create or join a pool

**Elements**:

- Logo/branding
- "Create Pool" button (becomes captain)
- "Join Pool" input (enter invite code, 6 chars, auto-uppercase)
- Brief explanation of how it works behind an icon

### 2. Create Pool (Captain)

**Purpose**: Set up a new betting pool

**Flow**:

1. Enter your name (you're the captain)
2. Enter pool name (e.g., "Super Bowl 2026")
3. Enter buy-in amount (optional)
4. Confirm creation
5. Show success with invite code (big, copyable)
6. Redirect to prop creation

### 3. Pool Dashboard (Captain - Admin Tab)

**Purpose**: Captain's command center

**Elements**:

- Tab toggle: [Admin] [My Picks]
- Pool status indicator
- Invite code card (big code, tap to copy)
- Quick stats (X participants, Y props)
- Action buttons: Add Props, Open Pool, Lock Betting, Mark Results
- Participants list with pick status
- Link to leaderboard

**Draft → Open Transition**:

Pools start in **draft** status. Captain adds props, then opens the pool.

- "Open Pool" button shown only in draft status
- Requires at least one prop to open
- Confirmation: "Open pool for participants? They'll be able to join and submit picks."
- After opening: status → `open`, invite code becomes shareable, participants can join

### 4. Add/Edit Props (Captain)

**Purpose**: Create and manage prop bets

**Per Prop**:

- Question text input
- Options list (add/remove/reorder)
- Point value input (default: 10)
- Save/Delete buttons

**List View**:

- All props in order
- Tap to edit
- Swipe to delete (with confirmation)

### 5. Join Pool (Participant)

**Purpose**: Enter the pool

**Flow**:

1. Show pool name and buy-in (confirm right pool)
2. Enter display name
3. Error if name taken: "Someone already took this name"
4. Join pool
5. Redirect to picks

### 6. My Picks (Participant & Captain's "My Picks" tab)

**Purpose**: View props and submit picks

**Before Lock**:

- Status banner: "Picks open"
- List of all props with options
- Tap option to select (highlighted)
- Submit/update picks button (sticky bottom)

**After Lock**:

- Status banner: "Betting locked - results coming"
- Show my picks with correct answers marked
- Show points earned per prop
- Running total at top

### 7. Leaderboard

**Purpose**: Show rankings

**Elements**:

- Last updated indicator
- Ranked list of participants
- Current points
- Correct/total picks (e.g., "5/10")
- Highlight current user's row
- Top 3 visually distinct

---

## Empty States

| Screen | Message | Action |
|--------|---------|--------|
| **Props (captain)** | "No props yet. Add your first question!" | "Add Prop" button |
| **Participants (captain)** | "No one has joined yet. Share your invite code!" | Copy code button |
| **My Picks (no props)** | "The captain hasn't added any props yet." | — |
| **Leaderboard (no results)** | "No results yet. Check back when betting locks!" | — |

**Design**: Centered, muted text, subtle icon, single action if applicable.

---

## Interaction Patterns

### Selection

- Single tap to select option
- Selected: primary color background, white text
- Unselected: subtle background, dark text
- Transition: 150ms ease
- Easy to change before lock *(Phase 3: edit picks)*

### Confirmation

- Important actions require confirmation modal:
  - "Lock betting?" → Yes/Cancel
  - "Mark [X] as correct?" → Confirm
  - "Delete this prop?" → Delete/Cancel

### Feedback & Toasts

- **Position**: Bottom center, above sticky buttons
- **Duration**: 3 seconds, auto-dismiss
- **Types**: Success (green), Error (red), Info (blue)
- Examples: "Picks saved!", "Invite code copied!", "Couldn't save. Try again."

### Loading States

Use **skeleton screens** (not spinners):
- Gray placeholder shapes matching content layout
- Subtle pulse animation (200ms)
- Content fades in when ready

### Animations

Match design-principles timings:
- Hover/tap feedback: 150ms ease
- Content reveals: 200ms ease
- Selection change: 150ms ease
- Subtle scale on tap: scale(1.02)

---

## Error States

### Network Errors

- Banner: "You're offline" with disabled actions
- UI remains visible with last known state
- Auto-retry when connection restored
- *(Phase 4: queue picks offline, sync when back)*

### Invalid Input

- Inline validation below field
- Red text, red border
- Clear message: "Name is required", "Name already taken"
- Don't clear valid fields

### Pool States

| Situation | Message | Action |
|-----------|---------|--------|
| Pool not found | "Pool not found. Check your invite code." | Back to home |
| Betting locked | "Betting is locked. You can view results." | Show results |
| Pool completed | "This pool has ended." | Show final leaderboard |

---

## Responsive Behavior

### Mobile (< 640px) - Primary

- Single column layout
- Full-width inputs and buttons
- Bottom-sticky actions
- Tab toggle horizontal at top
- 44px+ touch targets

### Tablet (640px - 1024px)

- Wider cards with more breathing room
- Optional two-column for captain dashboard
- Same interaction patterns

### Desktop (> 1024px)

- Centered container (max-width: 640px)
- Can show leaderboard sidebar
- Keyboard shortcuts for captain

---

## Component Checklist

### Core
- [ ] Header (logo, pool name, status badge)
- [ ] TabToggle (Admin / My Picks)
- [ ] PoolCard (invite code, stats)
- [ ] PropCard (question, options, points)
- [ ] OptionButton (unselected, selected, correct, incorrect)
- [ ] LeaderboardRow (rank, name, points, pick count)
- [ ] ParticipantRow (name, pick status)

### Forms
- [ ] TextField (label, input, error)
- [ ] NumberField (points)
- [ ] Button (primary, secondary, danger, disabled)
- [ ] IconButton (copy, delete, edit)

### Feedback
- [ ] StatusBadge (draft, open, locked, completed)
- [ ] Toast (success, error, info)
- [ ] ConfirmDialog
- [ ] EmptyState (icon, message, action)
- [ ] Skeleton (card, row variations)

### Layout
- [ ] PageContainer
- [ ] Card
- [ ] StickyFooter

