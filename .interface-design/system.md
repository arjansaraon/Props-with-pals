# Props With Pals — Design System

## Direction

Competitive social. Live scoreboard energy. Confident, not corporate.

Friends at a watch party checking picks on their phones. The interface should feel like a fantasy sports scoreboard, not a SaaS dashboard.

---

## Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#F8FAFC` | Page canvas — neutral cool gray |
| `--foreground` | `#1E293B` | Primary text |
| `--card` | `#FFFFFF` | Card surfaces |
| `--primary` | `#2563EB` | Actions, selections, links (blue-600) |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--secondary` | `#6366F1` | Secondary CTAs (indigo-500) |
| `--secondary-foreground` | `#FFFFFF` | Text on secondary |
| `--accent` | `#EEF2FF` | Hover/active backgrounds (indigo-50) |
| `--accent-foreground` | `#4338CA` | Text on accent (indigo-700) |
| `--muted` | `#F1F5F9` | Subtle backgrounds |
| `--muted-foreground` | `#64748B` | Secondary text |
| `--destructive` | `#EF4444` | Wrong picks, errors |
| `--success` | `#10B981` | Correct picks, completion |
| `--warning` | `#F59E0B` | Locked state, caution |
| `--border` | `#E2E8F0` | Card borders, dividers |
| `--ring` | `#2563EB` | Focus rings (matches primary) |

### Semantic colors
- Correct/success: `emerald-500/50/600/800` family
- Wrong/error: `destructive` + `red-50`
- Warning/locked: `amber-200/50/600/800` family

Button actions use centralized variants (see Button Variants below).
Contextual treatments (answer highlights, alert backgrounds, medal colors) use inline classes.

---

## Depth (3-tier shadow system)

| Tier | CSS Variable | Tailwind Class | Usage |
|------|-------------|----------------|-------|
| Low | `--shadow-sm` | `shadow-sm` | Empty states, helper cards |
| Medium | `--shadow-md` | `shadow-md` | Content cards (props, stats, player lists) |
| High | `--shadow-lg` | `shadow-lg` | Primary containers (headers, landing cards) |

### Shadow values
```
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.03)
--shadow-md: 0 2px 8px -1px rgba(0, 0, 0, 0.06), 0 1px 3px -1px rgba(0, 0, 0, 0.04)
--shadow-lg: 0 4px 16px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)
```

### Component shadow mapping
- **shadow-lg**: PoolHeader, leaderboard table card, landing page cards
- **shadow-md**: Prop cards, stats cards, player list cards, error cards, PropCard, AddPropForm
- **shadow-sm**: Empty states (admin tab "no props yet")
- **No shadow**: Leaderboard header (plain text, not wrapped in Card)

---

## Border Radius

| Token | Value |
|-------|-------|
| `--radius` | `0.625rem` (10px) |
| `--radius-sm` | `calc(--radius - 4px)` = 6px |
| `--radius-md` | `calc(--radius - 2px)` = 8px |
| `--radius-lg` | `--radius` = 10px |
| `--radius-xl` | `calc(--radius + 4px)` = 14px |

---

## Typography

**Font**: Geist Sans (body), Geist Mono (codes, numbers)

| Element | Classes |
|---------|---------|
| Pool name headings | `text-2xl font-bold tracking-tight` |
| Prop questions | `text-lg font-semibold` |
| Point values | `text-sm font-mono text-muted-foreground` |
| Leaderboard points | `text-sm font-semibold font-mono tabular-nums` |
| Invite codes | `text-2xl font-mono font-bold` |
| Stats numbers | `font-mono tabular-nums` |
| Labels | `text-sm font-medium` |
| Helper text | `text-xs text-muted-foreground` |

---

## Spacing

- **Base unit**: 4px
- **Card padding**: Default shadcn (px-6 py-4 via CardHeader/CardContent)
- **Section gaps**: `space-y-4`
- **Inner gaps**: `space-y-2`
- **Flex gaps**: `gap-2`, `gap-3`, `gap-4`
- **Rule**: All margin/padding values must be multiples of 4px. No `mt-0.5`, `py-3`, `gap-1.5`, or `space-y-3`.

---

## Leaderboard Scoreboard

### Header
Plain text — not wrapped in a Card. Back link + status badge row, then bare `h1`.
Back link: `text-sm text-muted-foreground hover:text-foreground transition-colors`.

### Table card
Wrapped in `shadow-lg` Card (the primary container on this page).

### Top-3 treatment (simplified)
Medals + subtle background only — no border-left accents.

| Rank | Background | Medal |
|------|-----------|-------|
| 1st (winner, if completed) | `bg-amber-50/60` | gold emoji |
| 2nd–3rd (if props resolved) | `bg-muted/30` | silver / bronze emoji |

- Points column: `font-mono tabular-nums` for alignment
- All rows: `hover:bg-muted/50 transition-colors`
- Winner (completed): `font-semibold` on name + points

---

## Option Buttons (Picks)

Applies to **both** `picks-view.tsx` (make picks) and `player-picks-view.tsx` (view someone's picks).
Read-only views use the same border/bg states but without hover interactivity.

| State | Classes |
|-------|---------|
| Default (interactive) | `bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/30` |
| Default (read-only) | `border-border` |
| Selected (unresolved) | `border-primary bg-primary/10` |
| Correct (resolved) | `border-emerald-500 bg-emerald-50` |
| Wrong (resolved) | `border-destructive bg-red-50` |
| All states | `px-4 py-3 rounded-lg border-2 transition-all duration-150` |

---

## Button Variants

Defined in `app/components/ui/button.tsx` via `class-variance-authority`:

| Variant | Classes | Usage |
|---------|---------|-------|
| `default` | `bg-primary text-primary-foreground hover:bg-primary/90` | Standard actions (Join Pool, Add Prop) |
| `secondary` | `bg-slate-800 text-white hover:bg-slate-700` | View Leaderboard, secondary CTAs |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | Delete actions |
| `success` | `bg-emerald-600 text-white hover:bg-emerald-700` | Correct/complete/submit (Mark Correct, Complete Pool, Submit Picks) |
| `warning` | `bg-amber-600 text-white hover:bg-amber-700` | Lock/caution (Lock Pool) |
| `outline` | `border border-input bg-background hover:bg-accent` | Back to Leaderboard, secondary actions |
| `ghost` | `hover:bg-accent hover:text-accent-foreground` | Add Option, Edit, icon buttons |

### Button sizing
- Default: `h-10 px-4`
- Primary CTAs (full-width submit/join): `h-12`
- Small: `h-9 px-3`

---

## Interactive States

All clickable elements must have:
- Hover background change (not just color/opacity)
- `transition-colors` for smooth feedback
- Focus ring via `focus-visible:ring-2 ring-ring`
