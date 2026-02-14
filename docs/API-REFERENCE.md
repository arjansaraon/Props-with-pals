# API Reference: Props-With-Pals

> Last updated: February 14, 2026

## Overview

RESTful API served via Next.js App Router API routes. All endpoints are prefixed with `/api`.

**Authentication**: httpOnly cookies containing per-pool secrets. See [Authentication](#authentication) section.
**Validation**: Zod schemas for all request bodies.
**Content-Type**: `application/json` for all requests and responses.

---

## Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/pools` | None | Create a pool |
| GET | `/api/pools/[code]` | None | Get pool details |
| PATCH | `/api/pools/[code]` | Captain | Update pool (name, description, status) |
| POST | `/api/pools/[code]/join` | None | Join a pool |
| GET | `/api/pools/[code]/players` | Captain | List all participants |
| POST | `/api/pools/[code]/props` | Captain | Create a prop |
| PATCH | `/api/pools/[code]/props/[id]` | Captain | Edit a prop |
| DELETE | `/api/pools/[code]/props/[id]` | Captain | Delete a prop |
| POST | `/api/pools/[code]/props/[id]/resolve` | Captain | Mark correct answer |
| POST | `/api/pools/[code]/props/reorder` | Captain | Reorder props |
| GET | `/api/pools/[code]/props/[id]/picks-count` | Captain | Get pick count for a prop |
| POST | `/api/pools/[code]/picks` | Participant | Submit a pick |
| GET | `/api/pools/[code]/leaderboard` | None | Get ranked standings |
| POST | `/api/pools/[code]/recover` | Token | Recover session via token |

---

## Pool Endpoints

### POST /api/pools — Create Pool

Creates a new pool and the captain as the first participant.

**Auth**: None

**Request Body**:
```json
{
  "name": "Super Bowl 2026",
  "captainName": "Arjan",
  "description": "Annual prop bet pool",
  "buyInAmount": "$20",
  "inviteCode": "superbowl-2026"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 1-100 chars |
| `captainName` | string | Yes | 1-50 chars |
| `description` | string | No | Max 500 chars |
| `buyInAmount` | string | No | Max 20 chars |
| `inviteCode` | string | No | 4-20 chars, lowercase letters/numbers/hyphens, no reserved words |

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "name": "Super Bowl 2026",
  "description": "Annual prop bet pool",
  "inviteCode": "arjan-superbowl-2026",
  "captainName": "Arjan",
  "buyInAmount": "$20",
  "status": "open",
  "createdAt": "2026-02-14T..."
}
```

**Side effects**: Sets httpOnly auth cookie with captain secret. Captain is auto-added as first participant.

**Errors**: `VALIDATION_ERROR` (400), `CODE_TAKEN` (409)

---

### GET /api/pools/[code] — Get Pool

Returns public pool details. Never exposes `captainSecret`.

**Auth**: None

**Response** `200 OK`:
```json
{
  "id": "uuid",
  "name": "Super Bowl 2026",
  "description": "Annual prop bet pool",
  "inviteCode": "arjan-superbowl-2026",
  "captainName": "Arjan",
  "buyInAmount": "$20",
  "status": "open",
  "createdAt": "2026-02-14T...",
  "updatedAt": "2026-02-14T..."
}
```

**Errors**: `POOL_NOT_FOUND` (404)

---

### PATCH /api/pools/[code] — Update Pool

Edit pool details or transition status.

**Auth**: Captain

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "locked"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | string | 1-100 chars, only when `open` |
| `description` | string \| null | Max 500 chars, only when `open` |
| `status` | string | Valid transitions only (see below) |

**Status transitions**: `open → locked → completed`. No skipping, no reversing.

**Response** `200 OK`: Updated pool object (same shape as GET).

**Errors**: `UNAUTHORIZED` (401), `POOL_NOT_FOUND` (404), `POOL_LOCKED` (400/403), `INVALID_TRANSITION` (400), `VALIDATION_ERROR` (400)

---

## Participant Endpoints

### POST /api/pools/[code]/join — Join Pool

Join a pool as a new participant.

**Auth**: None

**Request Body**:
```json
{
  "name": "Mike"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 1-50 chars, unique per pool |

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "poolId": "uuid",
  "name": "Mike",
  "totalPoints": 0,
  "status": "active",
  "joinedAt": "2026-02-14T..."
}
```

**Side effects**: Sets httpOnly auth cookie with participant secret.

**Errors**: `POOL_NOT_FOUND` (404), `POOL_LOCKED` (403), `NAME_TAKEN` (409), `VALIDATION_ERROR` (400)

---

### GET /api/pools/[code]/players — List Participants

Returns all participants with recovery URLs.

**Auth**: Captain

**Response** `200 OK`:
```json
{
  "players": [
    {
      "id": "uuid",
      "name": "Arjan",
      "totalPoints": 30,
      "joinedAt": "2026-02-14T...",
      "isCaptain": true,
      "recoveryUrl": "/pool/CODE/captain?token=abc123..."
    }
  ]
}
```

**Side effects**: Generates or reuses 7-day recovery tokens. Cleans up expired tokens.

**Errors**: `UNAUTHORIZED` (401), `POOL_NOT_FOUND` (404)

---

## Props Endpoints

### POST /api/pools/[code]/props — Create Prop

Add a new prop bet question to the pool.

**Auth**: Captain

**Request Body**:
```json
{
  "questionText": "Who scores the first touchdown?",
  "options": ["Patrick Mahomes", "Jalen Hurts", "Someone else"],
  "pointValue": 10,
  "category": "1st Quarter"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `questionText` | string | Yes | 1-500 chars |
| `options` | string[] | Yes | 2-10 items, each 1+ chars, unique (case-insensitive) |
| `pointValue` | number | Yes | Positive integer |
| `category` | string | No | Max 50 chars |

**Response** `201 Created`:
```json
{
  "id": "uuid",
  "poolId": "uuid",
  "questionText": "Who scores the first touchdown?",
  "options": ["Patrick Mahomes", "Jalen Hurts", "Someone else"],
  "pointValue": 10,
  "category": "1st Quarter",
  "correctOptionIndex": null,
  "status": "active",
  "order": 0,
  "createdAt": "2026-02-14T..."
}
```

**Constraint**: Pool must be `open`.

**Errors**: `UNAUTHORIZED` (401), `POOL_NOT_FOUND` (404), `POOL_LOCKED` (403), `VALIDATION_ERROR` (400)

---

### PATCH /api/pools/[code]/props/[id] — Edit Prop

Update an existing prop's text, options, points, or category.

**Auth**: Captain

**Request Body** (all fields optional):
```json
{
  "questionText": "Updated question?",
  "options": ["Option A", "Option B"],
  "pointValue": 20,
  "category": "2nd Quarter"
}
```

**Constraint**: Pool must be `open`.

**Response** `200 OK`: Updated prop object.

**Errors**: `UNAUTHORIZED` (401), `POOL_NOT_FOUND` (404), `PROP_NOT_FOUND` (404), `POOL_LOCKED` (403), `VALIDATION_ERROR` (400)

---

### DELETE /api/pools/[code]/props/[id] — Delete Prop

Permanently deletes a prop and all associated picks.

**Auth**: Captain

**Constraint**: Pool must be `open`.

**Response** `200 OK`:
```json
{ "success": true }
```

**Side effects**: Cascading delete of all picks for this prop. Recalculates affected player totals.

**Errors**: `UNAUTHORIZED` (401), `POOL_NOT_FOUND` (404), `PROP_NOT_FOUND` (404), `POOL_LOCKED` (403)

---

### POST /api/pools/[code]/props/[id]/resolve — Mark Correct Answer

Resolve a prop by marking which option was correct. Calculates points for all picks.

**Auth**: Captain

**Request Body**:
```json
{
  "correctOptionIndex": 0
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `correctOptionIndex` | number | Yes | 0-based index, must be within options array |

**Constraint**: Pool must be `locked`.

**Response** `200 OK`:
```json
{
  "prop": {
    "id": "uuid",
    "questionText": "Who scores the first touchdown?",
    "options": ["Patrick Mahomes", "Jalen Hurts", "Someone else"],
    "pointValue": 10,
    "correctOptionIndex": 0,
    "status": "active"
  },
  "pool": {
    "status": "locked"
  },
  "pointsAwarded": [
    {
      "playerId": "uuid",
      "participantName": "Mike",
      "pointsEarned": 10
    }
  ]
}
```

**Side effects**: Sets `correctOptionIndex`, calculates `pointsEarned` for all picks, updates participant `totalPoints`. Can be called again to change the answer while pool is still `locked`.

**Errors**: `UNAUTHORIZED` (401), `POOL_NOT_FOUND` (404), `POOL_NOT_LOCKED` (403), `PROP_NOT_FOUND` (404), `PROP_VOIDED` (400), `INVALID_OPTION` (400), `VALIDATION_ERROR` (400)

---

### POST /api/pools/[code]/props/reorder — Reorder Props

Set the display order for all props.

**Auth**: Captain

**Request Body**:
```json
{
  "propIds": ["uuid-1", "uuid-3", "uuid-2"]
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `propIds` | string[] | Yes | Non-empty array of prop UUIDs in desired order |

**Constraint**: Pool must be `open`.

**Response** `200 OK`:
```json
{ "success": true }
```

**Side effects**: Updates `order` field (0-based, matching array position).

**Errors**: `UNAUTHORIZED` (401), `POOL_NOT_FOUND` (404), `POOL_LOCKED` (403), `VALIDATION_ERROR` (400)

---

### GET /api/pools/[code]/props/[id]/picks-count — Pick Count

Get the number of picks submitted for a specific prop.

**Auth**: Captain

**Response** `200 OK`:
```json
{
  "count": 7
}
```

**Errors**: `UNAUTHORIZED` (401), `POOL_NOT_FOUND` (404), `PROP_NOT_FOUND` (404)

---

## Picks Endpoints

### POST /api/pools/[code]/picks — Submit Pick

Submit or update a pick for a prop. Upsert behavior: overwrites existing pick.

**Auth**: Participant

**Request Body**:
```json
{
  "propId": "uuid",
  "selectedOptionIndex": 2
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `propId` | string | Yes | Valid UUID, must belong to this pool |
| `selectedOptionIndex` | number | Yes | 0-based index, must be within prop's options |

**Constraint**: Pool must be `open`.

**Response** `201 Created` (new) or `200 OK` (updated):
```json
{
  "id": "uuid",
  "playerId": "uuid",
  "propId": "uuid",
  "selectedOptionIndex": 2,
  "createdAt": "2026-02-14T..."
}
```

**Errors**: `UNAUTHORIZED` (401), `POOL_NOT_FOUND` (404), `POOL_LOCKED` (403), `PROP_NOT_FOUND` (404), `INVALID_OPTION` (400), `VALIDATION_ERROR` (400)

---

### GET /api/pools/[code]/leaderboard — Leaderboard

Public ranked standings for a pool.

**Auth**: None

**Response** `200 OK`:
```json
{
  "poolId": "uuid",
  "poolName": "Super Bowl 2026",
  "poolStatus": "locked",
  "hasResolvedProps": true,
  "leaderboard": [
    {
      "id": "uuid",
      "name": "Arjan",
      "totalPoints": 30,
      "rank": 1,
      "isCaptain": true
    },
    {
      "id": "uuid",
      "name": "Mike",
      "totalPoints": 20,
      "rank": 2,
      "isCaptain": false
    }
  ]
}
```

**Ordering**: `totalPoints` DESC, then `name` ASC. Tied scores share the same rank.

**Errors**: `POOL_NOT_FOUND` (404)

---

## Recovery Endpoint

### POST /api/pools/[code]/recover — Recover Session

Re-issue an auth cookie using a recovery token (for users whose cookies were cleared).

**Auth**: Recovery token

**Request Body**:
```json
{
  "token": "abc123..."
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "name": "Mike"
}
```

**Side effects**: Sets httpOnly auth cookie. Marks token as used.

**Token rules**: Single-use, expires after 7 days, 43-character opaque string.

**Errors**: `MISSING_TOKEN` (400), `POOL_NOT_FOUND` (404), `INVALID_TOKEN` (401)

---

## Authentication

### Cookie Structure

A single `pwp_auth` cookie stores secrets for all pools the user participates in:

```json
{
  "pools": {
    "INVITE_CODE_1": "secret-uuid-1",
    "INVITE_CODE_2": "secret-uuid-2"
  }
}
```

**Cookie settings**: httpOnly, Secure (production), SameSite=Lax, 30-day sliding window, path `/`.

### CSRF Protection

All mutations (POST, PATCH, DELETE) validate the `Origin` header against the server's host. Requests with mismatched origins are rejected.

### Secret Comparison

All secret comparisons use **timing-safe comparison** (`crypto.timingSafeEqual`) to prevent timing attacks.

---

## Status & Permissions Matrix

What's allowed at each pool status:

| Action | Open | Locked | Completed |
|--------|------|--------|-----------|
| Join pool | Yes | No | No |
| Submit picks | Yes | No | No |
| Create/edit/delete props | Yes | No | No |
| Reorder props | Yes | No | No |
| Resolve props | No | Yes | No |
| Transition status | → locked | → completed | — |
| View leaderboard | Yes | Yes | Yes |
| View pool/players | Yes | Yes | Yes |

---

## Error Response Format

All errors follow this shape:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable description"
}
```

| HTTP Status | Code | When |
|-------------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 400 | `INVALID_OPTION` | Option index out of range |
| 400 | `INVALID_TRANSITION` | Invalid status change |
| 400 | `MISSING_TOKEN` | Recovery token not provided |
| 401 | `UNAUTHORIZED` | Missing or invalid secret |
| 401 | `INVALID_TOKEN` | Recovery token expired or used |
| 403 | `POOL_LOCKED` | Action not allowed in current status |
| 403 | `POOL_NOT_LOCKED` | Resolve requires locked status |
| 404 | `POOL_NOT_FOUND` | Invalid invite code |
| 404 | `PROP_NOT_FOUND` | Prop doesn't exist or wrong pool |
| 409 | `NAME_TAKEN` | Duplicate participant name |
| 409 | `CODE_TAKEN` | Custom invite code already in use |
| 500 | `INTERNAL_ERROR` | Server error |
