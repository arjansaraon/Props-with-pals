# Vision: Props-With-Pals

## Core Problem

Running prop bet pools with friends is currently:
- **Scattered**: Text threads, spreadsheets, group chats - picks get lost
- **Manual**: Someone has to track everything by hand during the game
- **Unclear**: Hard to see live standings, who's winning, who owes what
- **Barrier to entry**: Complex betting apps intimidate casual participants

Props-With-Pals solves this with a simple, mobile-friendly app designed for friend groups.

## Key Principles

- **Captain handles complexity**: One person (captain) manages the pool; everyone else just picks
- **No accounts needed**: Join with invite code + name - minimal friction
- **Hidden picks**: No peeking at friends' picks until betting locks
- **Live tracking**: Captain updates results, leaderboard updates instantly
- **Venmo-friendly**: Buy-in displayed, but money handled outside the app

## User Roles

### Captain (Admin)
The person organizing the pool. They:
- Create and name the pool
- Set the buy-in amount (informational)
- Add prop bets (questions + options + point values)
- Share the invite code
- Lock betting when the event starts
- Mark correct answers as events happen
- View final standings for Venmo settlements

### Participant
Friends who join to play. They:
- Join with invite code and their name
- View all prop bets and point values
- Submit picks before lock
- Watch the live leaderboard
- See final standings

## Core Features (MVP)

### Pool Management
- Create pool with name, event date, buy-in amount
- Generate unique invite code
- Lock/unlock betting

### Prop Bet Creation
- Add question text (e.g., "Who scores the first touchdown?")
- Add 2-6 multiple choice options
- Set point value for correct answer
- Edit/delete props before lock

### Participant Experience
- Join with invite code + name
- View all props and point values
- Submit one pick per prop
- See confirmation of picks
- Picks hidden from others until lock

### Live Scoring
- Captain marks correct answer for each prop
- Points auto-calculate
- Live leaderboard updates
- Show prop-by-prop results

### Leaderboard
- Ranked list of participants by points
- Show each person's correct/total picks
- Highlight current leaders

## Technical Approach

### Platform
- **Next.js** - Full-stack React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Mobile-first responsive design
- **SQLite** - Simple, file-based database (easy deployment)

### Architecture
- Server-side rendering for fast initial load
- API routes for data mutations
- Real-time updates via polling (simple, reliable)
- Single database file (easy backup/restore)

## Development Roadmap

### MVP: Core Pool Experience
**Goal**: Run a complete prop bet pool for a single event

**Features**:
- Create pool, add props, share code
- Participants join and submit picks
- Lock betting
- Captain marks results
- Live leaderboard

**Success Criteria**: Successfully run a prop bet pool for Super Bowl with 5+ friends

---

### Phase 2: Polish & Convenience
**Goal**: Improve usability based on MVP learnings

**Potential Features**:
- Edit picks before lock
- Prop categories/sections
- Pool history
- Shareable results image
- Push notifications (PWA)

---

### Phase 3: Advanced Features
**Goal**: Support more use cases

**Potential Features**:
- Multi-game pools (playoffs, tournaments)
- Recurring pools (weekly picks)
- Tiebreaker questions
- Partial points (closest to number)
- Pool templates

---

## Success Criteria

### MVP Success
- Captain can create a pool in under 5 minutes
- Participants can join and pick in under 2 minutes
- Captain can update results live during the game
- Everyone can see the leaderboard update in real-time
- No lost picks, no confusion about standings

### Long-term Success
- Becomes the go-to app for friend group betting pools
- Used for Super Bowl, March Madness, NFL playoffs, etc.
- Simple enough that anyone can be captain
- Fun, social experience that enhances watching games together

## Non-Goals

- **Real money handling**: We display buy-in, Venmo handles actual money
- **Odds/spreads calculation**: Captain sets point values manually
- **Professional betting features**: This is for friends, not serious gamblers
- **User accounts/authentication**: Keep it simple with invite codes
- **AI/automation**: Captain manually runs everything

---

**Next Step**: Define the data model in [DATA-MODEL.md](DATA-MODEL.md)
