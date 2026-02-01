# Design Principles: Props-With-Pals

These principles guide all design and development decisions.

## 1. Mobile-First, Always

The primary use case is checking picks and watching the leaderboard on your phone while watching the game.

**Guidelines**:
- Design for 375px width first, then scale up
- Touch targets minimum 44px
- Thumb-friendly navigation
- No hover-dependent interactions
- Fast load times on cellular

## 2. Minimal Friction

Getting people into a pool should take seconds, not minutes.

**Guidelines**:
- No accounts, no passwords
- Join with just invite code + name
- Captain setup under 5 minutes
- One-tap pick selection
- Clear confirmation of actions

## 3. Clarity Over Cleverness

Everyone should understand the state at a glance.

**Guidelines**:
- Obvious pool status (draft/open/locked/completed)
- Clear indication of submitted vs. not submitted
- Visible point values
- Unambiguous leaderboard
- No jargon or betting terminology

## 4. Captain Empowerment

The captain runs the show. Give them control.

**Guidelines**:
- Easy prop creation and editing
- Quick result marking (one tap per prop)
- Clear view of who's joined
- Lock/unlock control
- Shareable invite link/code

## 5. Social & Fun

This is for friends having fun, not serious gambling.

**Guidelines**:
- Celebratory feedback when picks are correct
- Leaderboard that builds excitement
- Easy to share results
- Light, friendly tone
- Visual feedback for live updates

## 6. Reliability Over Features

Better to do less, perfectly.

**Guidelines**:
- Never lose a pick
- Always show accurate scores
- Graceful offline handling
- Clear error messages
- Consistent behavior

## 7. Progressive Disclosure

Show what's needed, hide what's not.

**Guidelines**:
- Participant sees picks → results → leaderboard
- Captain sees what participants see + admin controls
- Advanced options hidden until needed
- Simple defaults, optional customization

---

## Visual Design Summary

### Colors
- Primary: TBD (something bold but friendly)
- Success: Green for correct picks
- Error: Red for wrong picks
- Neutral: Grays for structure

### Typography
- Large, readable text (minimum 16px)
- Clear hierarchy (headings, body, captions)
- High contrast for accessibility

### Spacing
- Generous padding (comfortable tapping)
- Clear separation between sections
- Breathing room around CTAs

---

**Next Step**: Define UX patterns in [ux-guide.md](ux-guide.md)
