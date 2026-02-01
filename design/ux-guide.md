# UX Guide: Props-With-Pals

Patterns and guidelines for consistent user experience.

## Navigation Structure

### Captain Views
```
Home → Create Pool → Pool Dashboard
                          ├── Edit Props
                          ├── View Participants
                          ├── Mark Results
                          └── Leaderboard
```

### Participant Views
```
Home → Join Pool → My Picks
                       ├── Submit Picks
                       └── View Leaderboard
```

## Key Screens

### 1. Home Screen
**Purpose**: Entry point - create or join a pool

**Elements**:
- Logo/branding
- "Create Pool" button (becomes captain)
- "Join Pool" input (enter invite code)
- Brief explanation of how it works

### 2. Create Pool (Captain)
**Purpose**: Set up a new betting pool

**Flow**:
1. Enter pool name
2. Enter buy-in amount (optional)
3. Confirm creation
4. Receive invite code
5. Redirect to prop creation

### 3. Pool Dashboard (Captain)
**Purpose**: Captain's command center

**Elements**:
- Pool status indicator
- Invite code (tap to copy)
- Quick stats (X participants, Y props)
- Action buttons: Add Props, Lock Betting, Mark Results
- Link to leaderboard

### 4. Add/Edit Props (Captain)
**Purpose**: Create and manage prop bets

**Per Prop**:
- Question text input
- Options list (add/remove/reorder)
- Point value input
- Save/Delete buttons

**List View**:
- All props in order
- Drag to reorder
- Tap to edit

### 5. Join Pool (Participant)
**Purpose**: Enter the pool

**Flow**:
1. Enter invite code (or auto-filled from URL)
2. Enter display name
3. Join pool
4. Redirect to picks

### 6. My Picks (Participant)
**Purpose**: View props and submit picks

**Before Lock**:
- List of all props with options
- Tap option to select
- Visual indication of selected
- Submit/update picks button

**After Lock**:
- Show my picks
- Show correct answers (as captain marks them)
- Show points earned per prop
- Running total

### 7. Leaderboard
**Purpose**: Show rankings

**Elements**:
- Ranked list of participants
- Current points
- Correct/total picks
- Highlight leader(s)
- Update indicator (when new results come in)

## Interaction Patterns

### Selection
- Single tap to select option
- Visual highlight on selected
- Easy to change before lock

### Confirmation
- Important actions require confirmation
- "Lock betting?" → Yes/Cancel
- "Mark [X] as correct?" → Confirm

### Feedback
- Success: Green check, brief animation
- Error: Red highlight, clear message
- Loading: Subtle spinner, don't block UI

### Real-time Updates
- Polling every 5-10 seconds when pool is active
- Visual pulse/highlight when data changes
- "Last updated X seconds ago" indicator

## Error States

### Network Errors
- "Couldn't connect. Tap to retry."
- Cache last known state
- Don't lose in-progress picks

### Invalid Input
- Inline validation
- Clear error messages
- Don't clear the form

### Pool States
- "Betting is locked" - explain, show when it locked
- "Pool not found" - suggest checking code
- "Pool completed" - show final results

## Responsive Behavior

### Mobile (< 640px)
- Single column layout
- Full-width inputs and buttons
- Bottom-sticky actions
- Collapsible sections

### Tablet (640px - 1024px)
- Optional two-column for captain dashboard
- More breathing room
- Same interaction patterns

### Desktop (> 1024px)
- Centered content container (max-width)
- Side-by-side props and leaderboard
- Keyboard shortcuts for captain

---

## Component Checklist

- [ ] Header (logo, pool status, navigation)
- [ ] Pool Card (summary info)
- [ ] Prop Card (question, options, points)
- [ ] Option Button (selectable, selected state)
- [ ] Leaderboard Row (rank, name, points)
- [ ] Input Field (with label, error state)
- [ ] Primary Button (main actions)
- [ ] Secondary Button (cancel, back)
- [ ] Status Badge (draft/open/locked/completed)
- [ ] Loading Spinner
- [ ] Error Message
- [ ] Success Toast

---

**Next Step**: Create MVP feature specs in [features/mvp/](../features/mvp/)
