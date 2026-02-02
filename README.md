# Props-With-Pals

A mobile-friendly web app for running prop bet pools with friends. The "captain" (admin) creates betting pools, adds multiple-choice prop questions with custom point values, and tracks results live. Friends join with a simple invite code - no accounts needed.

**Core Innovation**: Simple, social betting pools without the complexity. Captain handles all the admin (setting up props, marking winners, Venmo settlements), while participants just pick and watch the leaderboard.

**Platform Strategy**: Built with Next.js for a mobile-first web experience that works great on any device.

## Project Navigation

- **[docs/VISION.md](docs/VISION.md)** - High-level product vision, features, success criteria
- **[docs/ROADMAP.md](docs/ROADMAP.md)** - Development phases, milestones, decisions log
- **[docs/DATA-MODEL.md](docs/DATA-MODEL.md)** - Database schema, entities, relationships
- **[design/design-principles.md](design/design-principles.md)** - Core design principles
- **[design/ux-guide.md](design/ux-guide.md)** - UX patterns and guidelines
- **[design/technical-considerations.md](design/technical-considerations.md)** - Performance goals, architecture
- **[features/](features/)** - Feature specifications organized by phase

## Current Status

- **Phase: Setup** - Project initialized, documentation structure in place
- **Next: Define data model and core features**

## Tech Stack

- **Next.js 14** (App Router) - Full-stack React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Mobile-first styling
- **SQLite** (planned) - Simple, local database

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Navigate to the project directory:
```bash
cd Props-With-Pals
```

2. Install dependencies:
```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:3000` with hot reload enabled.

### Building

```bash
npm run build
```

## Project Structure

```
Props-With-Pals/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Home page
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── docs/                   # Product documentation
│   ├── VISION.md           # Product vision and roadmap
│   └── DATA-MODEL.md       # Database schema (to be defined)
├── design/                 # Design documentation
│   ├── design-principles.md
│   └── ux-guide.md
├── features/               # Feature specifications
│   └── mvp/
├── public/                 # Static assets
├── package.json
└── tsconfig.json
```

## How It Works

### Captain (Admin) Flow
1. Create a new pool (e.g., "Super Bowl 2026")
2. Set Venmo buy-in amount (displayed to users)
3. Add prop bets as multiple-choice questions with point values
4. Share invite code with friends
5. Lock betting when the event starts
6. Update correct answers live as events happen
7. View final leaderboard and settle up on Venmo

### Participant Flow
1. Join pool with invite code + name
2. See all prop bets and point values
3. Submit picks (hidden from others until lock)
4. Watch live leaderboard as captain updates results
5. See final standings

## Development Principles

### 1. Update Over Add
- Modify existing code first
- Refactor before adding
- Don't duplicate logic

### 2. File Size & Modularity
- Keep files under 300 lines
- Separate concerns (logic, UI, utilities)
- Don't create premature abstractions

### 3. Ask Questions, Don't Assume
- Unclear requirements? Ask first
- Multiple valid approaches? Present options
- Never guess - assumptions lead to rework

### 4. Separate Business Logic from UI
- Business logic in hooks/utils
- Components render UI only
- Pure functions when possible

### Key Files
- [app/page.tsx](app/page.tsx) - Main page
- [docs/VISION.md](docs/VISION.md) - Product vision

## License

MIT
