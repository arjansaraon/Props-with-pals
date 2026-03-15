# Spec: Underdog Pick Type

> Added: March 2026

## Overview

Certain options within a prop can be designated as "underdogs." If a player correctly picks an underdog option, they earn **2× the prop's base point value** instead of the standard 1×. This adds strategic depth — underdogs are riskier bets with higher reward.

---

## Behavior

### Captain
- When creating or editing a prop (pool must be `open`), the captain can mark any number of options as underdogs using a star toggle in the UI.
- Underdog designations are stored as `underdogOptionIndices: number[]` on the prop — an array of option array indices.
- Multiple options on the same prop can be underdogs simultaneously.
- If the captain edits a prop's options without re-specifying underdog indices, designations are **cleared to `[]`** (prevents stale index references).
- Underdog changes are **blocked after the pool is locked** — same restriction as all other prop edits.

### Player
- Underdog options are visible with a **"2×"** badge when making picks, so players know the bonus before choosing.
- Picking an underdog is not required; players can pick any option.

### Scoring (at resolve time)
| Pick result | Underdog? | Points earned |
|---|---|---|
| Correct | Yes | `pointValue × 2` |
| Correct | No | `pointValue` |
| Wrong | Yes | `0` |
| Wrong | No | `0` |

---

## Data Model

### `props` table — new column
```
underdog_option_indices  TEXT  (JSON-encoded number[])  nullable
```
- `null` or `[]` → no underdogs (standard scoring)
- `[1]` → option at index 1 is an underdog
- `[0, 2]` → options at indices 0 and 2 are underdogs

### API changes
- `POST /api/pools/[code]/props` — accepts optional `underdogOptionIndices: number[]`
- `PATCH /api/pools/[code]/props/[id]` — accepts optional `underdogOptionIndices: number[] | null`
  - If `options` is updated without `underdogOptionIndices`, underdog indices are auto-reset to `[]`
- `POST /api/pools/[code]/props/[id]/resolve` — applies 2× multiplier for underdog correct picks; returns `underdogOptionIndices` in response

---

## Test Cases

1. Correct underdog pick → earns `pointValue * 2`
2. Correct non-underdog pick → earns `pointValue`
3. Wrong underdog pick → earns `0`
4. `underdogOptionIndices: null` or `[]` → correct pick earns `pointValue` (backwards compat)
5. Multiple underdogs — whichever underdog is resolved as correct earns 2×
6. POST prop with `underdogOptionIndices` → saved and returned
7. PATCH with out-of-bounds underdog index → `400 VALIDATION_ERROR`
8. PATCH `options` without `underdogOptionIndices` → underdogs auto-reset to `[]`
9. PATCH only `underdogOptionIndices` (no options change) → saved correctly

---

## UI Notes

- **Add Prop / Edit Prop form**: Star (⭐) toggle button per option. Active state = amber. Tooltip: "Mark as underdog (2× points if correct)".
- **Picks view (player)**: Amber "2×" badge inline with option label for any underdog options.
- **Prop card (captain view mode)**: Same "2×" badge so captain can verify designations.
