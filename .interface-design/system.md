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

### Semantic colors (hardcoded, not tokens)
- Correct: `emerald-500/50/600/800` family
- Wrong: `destructive` + `red-50`
- Warning/locked: `amber-200/50/600/800` family

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
- **shadow-lg**: PoolHeader, leaderboard header card, landing page cards
- **shadow-md**: Prop cards, stats cards, player list cards, error cards, PropCard, AddPropForm
- **shadow-sm**: Empty states (admin tab "no props yet")

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
- **Flex gaps**: `gap-2`, `gap-3`

---

## Leaderboard Scoreboard

Top 3 rows get ranked visual treatment:

| Rank | Background | Left border | Medal |
|------|-----------|-------------|-------|
| 1st | `bg-amber-50/60` | `border-l-4 border-amber-400` | gold emoji |
| 2nd | `bg-slate-50/60` | `border-l-4 border-slate-300` | silver emoji |
| 3rd | `bg-amber-50/40` | `border-l-4 border-amber-600/40` | bronze emoji |

- Points column: `font-mono tabular-nums` for alignment
- All rows: `hover:bg-muted/50 transition-colors`
- Winner (completed): `font-semibold` on name + points

---

## Option Buttons (Picks)

| State | Classes |
|-------|---------|
| Default (interactive) | `bg-muted/50 border-transparent hover:bg-muted hover:border-muted-foreground/30` |
| Selected (unresolved) | `border-primary bg-primary/5` |
| Correct (resolved) | `border-emerald-500 bg-emerald-50` |
| Wrong (resolved) | `border-destructive bg-red-50` |
| All states | `px-4 py-3 rounded-lg border-2 transition-all duration-150` |
