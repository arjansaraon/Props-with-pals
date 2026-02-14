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
- Celebratory feedback when picks are correct (see below)
- Leaderboard that builds excitement
- Easy to share results
- Light, friendly tone
- Visual feedback for live updates

### Celebratory Feedback (Duolingo-style)

When a pick is revealed as **correct**:
1. **Green pulse** - card background flashes green (300ms)
2. **Checkmark pop** - animated checkmark scales in with bounce (scale 0→1.2→1, 400ms)
3. **Points fly-up** - "+10 pts" floats up and fades (600ms)
4. **Subtle confetti** - small burst of 8-12 particles, contained to card area

When moving **up on leaderboard**:
- Row slides into new position with ease-out
- Rank badge pulses once
- "↑2" indicator shows positions gained

**Keep it lightweight**:
- CSS animations only (no heavy JS libraries)
- Particles via CSS transforms, not canvas
- Total animation bundle: < 5KB
- Respect `prefers-reduced-motion`

## 6. Reliability Over Features

Better to do less, perfectly.

**Guidelines**:
- Never lose a confirmed pick (Phase 5: queue picks offline)
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

## Visual Design System

### Style: Sleek Minimal with Warmth
- Clean, scannable layouts (easy to check during game chaos)
- Rounded corners (8px default, 12px for cards)
- Subtle shadows for depth
- High contrast for readability
- One bold accent color for actions

### Colors (Light Mode)

Use CSS variables for easy dark mode later.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | Indigo #6366F1 | Primary buttons, links, selected states |
| `--color-primary-hover` | #4F46E5 | Hover states |
| `--color-success` | Green #10B981 | Correct picks, positive feedback |
| `--color-error` | Red #EF4444 | Wrong picks, errors |
| `--color-warning` | Amber #F59E0B | Warnings, pending states |
| `--color-bg` | White #FFFFFF | Page background |
| `--color-bg-subtle` | Gray #F9FAFB | Card backgrounds, sections |
| `--color-border` | Gray #E5E7EB | Borders, dividers |
| `--color-text` | Gray #111827 | Primary text |
| `--color-text-muted` | Gray #6B7280 | Secondary text, captions |

### Typography
- **Font**: System font stack (fast, native feel)
- **Base size**: 16px minimum
- **Headings**: Bold, clear hierarchy (24/20/18/16)
- **Body**: Regular weight, 1.5 line height
- **High contrast**: 4.5:1 minimum for accessibility

### Spacing Scale
Use consistent spacing (Tailwind defaults):
- `4px` - tight (inline elements)
- `8px` - small (between related items)
- `16px` - medium (between sections)
- `24px` - large (major sections)
- `32px+` - extra (page margins)

### Component Patterns
- **Buttons**: Rounded (8px), bold text, generous padding (12px 24px)
- **Cards**: Rounded (12px), subtle shadow, white background
- **Inputs**: Rounded (8px), visible border, focus ring
- **Touch targets**: Minimum 44px height

### Micro-interactions
- **Transitions**: 150ms ease for hover, 200ms for reveals
- **Feedback**: Subtle scale (1.02) on tap, color change on selection
- **Loading**: Spinners on buttons during mutations, skeleton loaders for page content (Phase 4: full skeleton screens)

---

## Dark Mode (Phase 5)

Swap CSS variables - same structure, inverted palette:
- `--color-bg`: #0F172A (dark slate)
- `--color-bg-subtle`: #1E293B
- `--color-text`: #F8FAFC
- `--color-text-muted`: #94A3B8
- Primary/success/error colors adjusted for dark backgrounds

