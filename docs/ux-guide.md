# UX Guide: Props-With-Pals

Patterns and guidelines for consistent user experience.

> **Note**: This guide describes the full product vision. Features are implemented across phases—see [ROADMAP.md](ROADMAP.md) for what's included in each phase.

## URL Routes & Smart Links

### Routes
```
/                                → Home (create or join)
/pool/{code}                     → Join pool entry page
/pool/{code}/captain             → Captain dashboard (auth via httpOnly cookie)
/pool/{code}/picks               → Participant picks (auth via httpOnly cookie)
/pool/{code}/leaderboard         → Public leaderboard
/pool/{code}/player/{id}         → Individual player's picks view
```

### Smart Link Behavior (Phase 4)
When user visits `/pool/{code}`:
1. Check localStorage for saved metadata for this pool
2. If found + valid cookie → redirect to their view (captain or participant)
3. If not found → show join form (or pool info if locked)

---

## User Persistence

### How Users Stay Logged In

**Authentication**: httpOnly cookies set by the server on pool creation/join. Secrets are never exposed to client-side JavaScript.

**Metadata**: localStorage stores non-sensitive user info keyed by pool invite code:
```javascript
{
  "pwp_ABC123": { "name": "Mike", "isCaptain": false },
  "pwp_XYZ789": { "name": "Arjan", "isCaptain": true }
}
```

### Returning User Flow
1. User clicks link or enters code
2. Browser sends httpOnly cookie automatically
3. Server authenticates via cookie → loads their view
4. If cookie missing → show join form or trigger recovery flow

### Lost Access
- **Recovery tokens**: If cookies are cleared, `RecoveryHandler` component triggers fallback auth to re-issue the cookie
- **Participants**: Can rejoin the pool (same name re-authenticates)
- **Captain**: Recovery token flow available; worst case, no recovery (acceptable for friend app)

---

## Navigation Structure

### Captain Views
Captain has a **3-tab interface** at top:
```
┌──────────────────────────────────────┐
│  [Admin]  [My Picks]  [Players]      │
├──────────────────────────────────────┤
│  (content changes based on tab)      │
└──────────────────────────────────────┘

Admin tab:
  ├── Prop list with drag-and-drop reorder
  ├── Collapsible "Add New Prop" form
  ├── Edit props (modal)
  ├── Delete props (draft mode only)
  └── Mark correct answers (locked mode)

My Picks tab:
  └── Same as participant picks view

Players tab:
  ├── View all participants
  └── Access individual player picks with popularity stats
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

- 3-tab interface: [Admin] [My Picks] [Players]
- Pool header with status indicator, invite code (tap to copy), share buttons
- Prop list with drag-and-drop reorder and category grouping
- Collapsible "Add New Prop" form
- Status-aware action buttons (Open Pool, Lock Betting, based on pool state)
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
- Easy to change before lock *(Phase 4: edit picks)*

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

**Current approach**: Spinners on buttons + skeleton loaders for page content.

- Spinner on buttons during mutations (prevents double-submit)
- Skeleton loaders for page-level data fetching
- Content fades in when ready
- Phase 4: Full skeleton screen replacements for all loading states

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
- *(Phase 5: queue picks offline, sync when back)*

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
- [x] PoolHeader (pool name, status badge, invite code, share buttons)
- [x] CaptainTabsClient (Admin / My Picks / Players)
- [x] PropCard (question, options, points, drag-and-drop)
- [x] OptionButton (unselected, selected, correct, incorrect)
- [x] LeaderboardRow (rank, name, points, pick count)
- [x] ParticipantRow (name, pick status)

### Forms
- [x] TextField (via shadcn/ui Input)
- [x] NumberField (via shadcn/ui Input)
- [x] Button (primary, secondary, danger, disabled - via shadcn/ui)
- [x] IconButton (copy, delete, edit)

### Feedback
- [x] StatusBadge (draft, open, locked, completed)
- [x] Toast (success, error, info - via sonner)
- [ ] ConfirmDialog (Phase 4)
- [x] EmptyState (icon, message, action)
- [x] Skeleton (via shadcn/ui Skeleton)

### Layout
- [x] PageContainer
- [x] Card (via shadcn/ui Card)
- [ ] StickyFooter (Phase 4)

