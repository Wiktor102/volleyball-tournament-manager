# Volleyball Tournament Management System - Implementation Plan

## Problem Statement
Create a LAN-based web application for hosting and tracking school volleyball tournaments with real-time updates, multiple device access, and various specialized views for admins, players, and fans. The system must support single-elimination tournaments with manual bracket import, flexible scoring systems, and a fancy OBS streaming overlay.

## Key Requirements Summary
- **Tech Stack**: Node.js + React + TypeScript
- **Real-time**: Socket.io for live updates (no polling)
- **Database**: SQLite for LAN portability (no internet dependency)
- **Tournament**: Single-elimination with 3rd place match, variable team count (with byes)
- **Scoring**: Flexible per-round (sets+points, points-only, time-based)
- **Courts**: Single court (one match at a time)
- **Players**: Names only
- **Language**: Polish only
- **Special**: OBS overlay with fancy animations

---

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        LAN Network                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │   Host Computer  │     │        Client Devices            │  │
│  │                  │     │                                  │  │
│  │  ┌────────────┐  │     │  ┌─────────┐  ┌─────────┐       │  │
│  │  │ Node.js    │◄─┼─────┼──┤ Admin   │  │ Admin   │       │  │
│  │  │ Server     │  │     │  │ Panel 1 │  │ Panel 2 │       │  │
│  │  │ (Express)  │  │     │  └─────────┘  └─────────┘       │  │
│  │  └─────┬──────┘  │     │                                  │  │
│  │        │         │     │  ┌─────────┐  ┌─────────┐       │  │
│  │  ┌─────▼──────┐  │     │  │ Player  │  │  Fan    │       │  │
│  │  │ Socket.io  │◄─┼─────┼──┤ Display │  │ Display │       │  │
│  │  │  Server    │  │     │  └─────────┘  └─────────┘       │  │
│  │  └─────┬──────┘  │     │                                  │  │
│  │        │         │     │  ┌─────────┐  ┌─────────┐       │  │
│  │  ┌─────▼──────┐  │     │  │   OBS   │  │ Bracket │       │  │
│  │  │  SQLite    │  │     │  │ Overlay │  │ Display │       │  │
│  │  │  Database  │  │     │  └─────────┘  └─────────┘       │  │
│  │  └────────────┘  │     │                                  │  │
│  └──────────────────┘     └──────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack Details

#### Backend
- **Runtime**: Node.js (current LTS = 24.x)
- **Framework**: Express.js
- **Real-time**: Socket.io (bi-directional WebSocket communication)
- **Database**: SQLite3 with better-sqlite3 (synchronous, fast)
- **ORM**: Drizzle ORM (type-safe, lightweight)
- **Validation**: Zod (runtime type validation)
- **Language**: TypeScript

#### Frontend
- **Framework**: React 19+ with TypeScript
- **Build Tool**: Vite (fast HMR, optimized builds)
- **Styling**: Custom CSS/SCSS + Framer Motion (animations)
- **State Management**: Zustand (lightweight) + Socket.io client
- **Routing**: React Router v7
- **UI Components**: Custom components with Radix UI primitives
- **Icons**: Lucide React

#### Project Structure
```
volleyball-tournament/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── drizzle.config.ts
├── .env.example
│
├── server/                      # Backend
│   ├── index.ts                 # Entry point
│   ├── config.ts                # Configuration
│   │
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema definitions
│   │   ├── index.ts             # Database connection
│   │   └── migrations/          # SQL migrations
│   │
│   ├── socket/
│   │   ├── index.ts             # Socket.io setup
│   │   ├── handlers/
│   │   │   ├── tournament.ts    # Tournament events
│   │   │   ├── match.ts         # Match events
│   │   │   ├── team.ts          # Team events
│   │   │   └── bracket.ts       # Bracket events
│   │   └── middleware.ts        # Socket middleware
│   │
│   ├── services/
│   │   ├── tournament.service.ts
│   │   ├── match.service.ts
│   │   ├── team.service.ts
│   │   ├── bracket.service.ts
│   │   └── scoring.service.ts   # Scoring logic (extensible)
│   │
│   └── utils/
│       ├── bracket-utils.ts     # Bracket generation helpers
│       └── validation.ts        # Zod schemas
│
├── src/                         # Frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   │
│   ├── socket/
│   │   ├── context.tsx          # Socket.io React context
│   │   ├── hooks.ts             # useSocket, useSubscription
│   │   └── events.ts            # Event type definitions
│   │
│   ├── stores/
│   │   ├── tournament.store.ts  # Zustand tournament state
│   │   ├── match.store.ts       # Live match state
│   │   └── ui.store.ts          # UI state (modals, etc.)
│   │
│   ├── components/
│   │   ├── ui/                  # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── ...
│   │   │
│   │   ├── bracket/
│   │   │   ├── BracketView.tsx      # Full bracket visualization
│   │   │   ├── BracketMatch.tsx     # Single match in bracket
│   │   │   ├── BracketConnector.tsx # Lines connecting matches
│   │   │   └── BracketMini.tsx      # Compact bracket for overlay
│   │   │
│   │   ├── match/
│   │   │   ├── MatchCard.tsx
│   │   │   ├── ScoreDisplay.tsx
│   │   │   ├── ScoreEditor.tsx      # Admin score editing
│   │   │   ├── SetScoreDisplay.tsx
│   │   │   └── MatchTimer.tsx
│   │   │
│   │   ├── team/
│   │   │   ├── TeamCard.tsx
│   │   │   ├── TeamEditor.tsx
│   │   │   ├── TeamList.tsx
│   │   │   └── PlayerList.tsx
│   │   │
│   │   └── overlay/
│   │       ├── OverlayWrapper.tsx   # Transparent background
│   │       ├── ScoreBar.tsx         # Main score display
│   │       ├── InfoRotator.tsx      # Rotating info panels
│   │       ├── BracketPreview.tsx   # Animated bracket
│   │       └── animations/          # Framer Motion variants
│   │
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── Dashboard.tsx        # Main admin hub
│   │   │   ├── TournamentSetup.tsx  # Create/configure tournament
│   │   │   ├── BracketEditor.tsx    # Manual bracket editing
│   │   │   ├── MatchControl.tsx     # Live match control
│   │   │   ├── TeamsManager.tsx     # Manage teams/players
│   │   │   └── Settings.tsx         # Tournament settings
│   │   │
│   │   ├── display/
│   │   │   ├── FanView.tsx          # Big screen for audience
│   │   │   ├── PlayerInfo.tsx       # Player-focused display
│   │   │   ├── BracketDisplay.tsx   # Full bracket screen
│   │   │   └── UpcomingMatches.tsx  # Schedule display
│   │   │
│   │   └── overlay/
│   │       ├── StreamOverlay.tsx    # OBS browser source
│   │       └── OverlayConfig.tsx    # Overlay customization
│   │
│   ├── hooks/
│   │   ├── useMatch.ts
│   │   ├── useTournament.ts
│   │   ├── useRealtime.ts
│   │   └── useAnimatedValue.ts
│   │
│   ├── utils/
│   │   ├── format.ts            # Score formatting
│   │   ├── colors.ts            # Team colors
│   │   └── constants.ts
│   │
│   └── types/
│       ├── tournament.ts
│       ├── match.ts
│       ├── team.ts
│       └── scoring.ts
│
├── public/
│   ├── sounds/                  # Optional sound effects
│   └── fonts/                   # Custom fonts
│
└── data/
    └── tournament.db            # SQLite database file
```

---

## Database Schema

### Entity Relationship Diagram
```
┌─────────────────┐       ┌─────────────────┐
│   Tournament    │       │   ScoringMode   │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ name            │       │ tournament_id   │
│ status          │       │ round_number    │
│ created_at      │       │ mode_type       │
│ settings (JSON) │       │ config (JSON)   │
└────────┬────────┘       └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│      Team       │       │     Player      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────┤ id (PK)         │
│ tournament_id   │  1:N  │ team_id (FK)    │
│ name            │       │ name            │
│ short_name      │       │ created_at      │
│ color           │       └─────────────────┘
│ seed            │
│ eliminated      │
│ created_at      │
└────────┬────────┘
         │
         │ N:M (via BracketMatch)
         ▼
┌─────────────────────────────────────────────┐
│               BracketMatch                   │
├─────────────────────────────────────────────┤
│ id (PK)                                      │
│ tournament_id (FK)                           │
│ round_number                                 │
│ match_number                                 │
│ position_in_round                            │
│ team1_id (FK, nullable)                      │
│ team2_id (FK, nullable)                      │
│ winner_id (FK, nullable)                     │
│ status (pending|live|completed)              │
│ is_third_place_match                         │
│ next_match_id (FK, self-ref, nullable)       │
│ scheduled_time (nullable)                    │
│ created_at                                   │
└──────────────────────┬──────────────────────┘
                       │
                       │ 1:1
                       ▼
┌─────────────────────────────────────────────┐
│               MatchScore                     │
├─────────────────────────────────────────────┤
│ id (PK)                                      │
│ match_id (FK, unique)                        │
│ scoring_mode                                 │
│ team1_sets                                   │
│ team2_sets                                   │
│ current_set                                  │
│ sets_to_win                                  │
│ set_scores (JSON: [{t1: 25, t2: 23}, ...])  │
│ team1_current_points                         │
│ team2_current_points                         │
│ match_time_seconds (for timed mode)          │
│ started_at                                   │
│ ended_at                                     │
│ updated_at                                   │
└─────────────────────────────────────────────┘
```

### Scoring Modes Configuration
```typescript
// Sets + Points mode
{
  mode: 'sets',
  setsToWin: 2,          // Best of 3
  pointsToWinSet: 25,    // First to 25
  finalSetPoints: 15,    // Tiebreaker set to 15
  mustWinByTwo: true,    // Deuce rule
  pointsCap: null        // Optional max points
}

// Points only mode
{
  mode: 'points',
  pointsToWin: 25,
  mustWinByTwo: true,
  pointsCap: 30
}

// Timed mode
{
  mode: 'timed',
  durationMinutes: 15,
  overtimeOnTie: false,  // Higher score wins, or...
  tiebreaker: 'golden'   // ...golden point on tie
}
```

---

## Real-time Communication Design

### Socket.io Event Architecture

#### Server → Client Events (Broadcasts)
```typescript
// Tournament-wide updates
'tournament:updated'       // Tournament settings changed
'tournament:status'        // Tournament started/paused/ended

// Bracket updates
'bracket:updated'          // Bracket structure changed
'bracket:match:assigned'   // Team assigned to match slot

// Match updates (most frequent)
'match:status'             // Match started/ended
'match:score'              // Score changed (points/sets)
'match:timer'              // Timer tick (for timed mode)

// Team updates
'team:updated'             // Team info changed
'team:eliminated'          // Team knocked out
```

#### Client → Server Events (Actions)
```typescript
// Admin actions
'admin:score:update'       // Update match score
'admin:score:increment'    // +1 point for team
'admin:score:decrement'    // -1 point for team
'admin:match:start'        // Begin match
'admin:match:end'          // End match manually
'admin:match:reset'        // Reset match score
'admin:team:update'        // Edit team info
'admin:bracket:assign'     // Assign team to slot
'admin:bracket:swap'       // Swap two teams
'admin:timer:start'        // Start match timer
'admin:timer:pause'        // Pause timer
'admin:timer:reset'        // Reset timer
```

### Room-based Broadcasting
```typescript
// Clients join rooms based on their view
socket.join('tournament:${tournamentId}')  // All clients
socket.join('match:${matchId}')            // Match-specific updates
socket.join('admin')                        // Admin-only notifications
```

### Conflict Resolution Strategy
When multiple admins edit simultaneously:
1. **Last-write-wins** for simple fields (team name, etc.)
2. **Server-authoritative** for scores (all increments processed server-side)
3. **Optimistic UI** with rollback on conflict
4. **Visual indicators** showing when another admin is editing same item

---

## UI/UX Design Specifications

### Design System

#### Color Palette
```css
/* Primary - Energetic volleyball orange */
--primary-500: #FF6B35;
--primary-600: #E85A24;

/* Secondary - Deep court blue */
--secondary-500: #1E3A5F;
--secondary-600: #152C4A;

/* Accent - Victory gold */
--accent-500: #FFD23F;

/* Semantics */
--success: #10B981;
--warning: #F59E0B;
--danger: #EF4444;

/* Neutrals */
--gray-900: #111827;
--gray-100: #F3F4F6;
```

#### Typography
- **Headings**: Inter (Bold/Semibold) - clean, modern, sporty
- **Body**: Inter (Regular/Medium)
- **Scores**: Oswald or Bebas Neue (bold, condensed) - scoreboard feel

### Page Designs

#### 1. Admin Dashboard (`/admin`)
```
┌──────────────────────────────────────────────────────────────┐
│  🏐 Panel Administratora                    [Ustawienia] [?] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │   AKTUALNY MECZ         │  │   DRABINKA              │   │
│  │                         │  │                         │   │
│  │  Drużyna A    2         │  │   [Mini bracket view]   │   │
│  │      vs                 │  │                         │   │
│  │  Drużyna B    1         │  │                         │   │
│  │                         │  │                         │   │
│  │  Set 3: 14-12           │  │                         │   │
│  │                         │  │                         │   │
│  │  [Kontroluj mecz]       │  │   [Pełna drabinka]      │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │   NASTĘPNY MECZ         │  │   SZYBKIE AKCJE         │   │
│  │                         │  │                         │   │
│  │   Drużyna C vs TBD      │  │   [+ Dodaj drużynę]     │   │
│  │   Ćwierćfinał #2        │  │   [📋 Importuj]         │   │
│  │                         │  │   [🖥️ Otwórz overlay]   │   │
│  │   [Rozpocznij]          │  │   [📺 Widok dla fanów]  │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 2. Match Control (`/admin/match/:id`)
```
┌──────────────────────────────────────────────────────────────┐
│  ← Powrót    KONTROLA MECZU - Ćwierćfinał #1                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│          DRUŻYNA A                    DRUŻYNA B              │
│                                                              │
│    ┌─────────────────┐          ┌─────────────────┐         │
│    │                 │          │                 │         │
│    │    [-] 14 [+]   │   SET    │    [-] 12 [+]   │         │
│    │                 │    3     │                 │         │
│    └─────────────────┘          └─────────────────┘         │
│                                                              │
│         SETY: 2                       SETY: 1               │
│                                                              │
│    ┌─────────────────────────────────────────────┐          │
│    │  Set 1: 25-20  │  Set 2: 18-25  │  Set 3    │          │
│    └─────────────────────────────────────────────┘          │
│                                                              │
│    [⏱️ Timer: 00:00]   [▶️ Start]   [⏸️ Pauza]              │
│                                                              │
│    ┌──────────────────────────────────────────────────────┐ │
│    │  [🔄 Resetuj set]  [⏪ Cofnij]  [🏆 Zakończ mecz]     │ │
│    └──────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 3. Fan Display (`/display/fan`) - Full Screen
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    🏐 TURNIEJ SIATKÓWKI 2026                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │    DRUŻYNA ALFA              DRUŻYNA BETA              │ │
│  │                                                        │ │
│  │         ██████                    ████                 │ │
│  │           2                         1                  │ │
│  │         SETY                      SETY                 │ │
│  │                                                        │ │
│  │    ┌──────────────────────────────────────────────┐   │ │
│  │    │              SET 3: 14 - 12                  │   │ │
│  │    └──────────────────────────────────────────────┘   │ │
│  │                                                        │ │
│  │    Set 1: 25-20    Set 2: 18-25    Set 3: ...        │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│     Następny mecz: Drużyna C vs Drużyna D (za ~15 min)      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 4. OBS Overlay (`/overlay`) - Transparent Background
```
┌──────────────────────────────────────────────────────────────┐
│ (transparent background - only elements visible)            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DRUŻYNA ALFA │ 2 │ 14 ║ 12 │ 1 │ DRUŻYNA BETA        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                              ┌─────────────┐ │
│                                              │ Ćwierćfinał │ │
│                                              │   1 z 4     │ │
│                                              └─────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📊 (Animowany panel - rotuje: następny mecz,         │   │
│  │     mini-drabinka, statystyki, itp.)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Animation Specifications (Framer Motion)

#### Score Change Animation
```typescript
// When score updates, number scales up briefly
{
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.3, 1],
    transition: { duration: 0.3 }
  }
}

// Optional: particle burst effect on point
```

#### Set Win Animation
```typescript
// Winning team's score area pulses with glow
{
  animate: {
    boxShadow: [
      '0 0 0 rgba(255,215,0,0)',
      '0 0 30px rgba(255,215,0,0.8)',
      '0 0 0 rgba(255,215,0,0)'
    ],
    transition: { duration: 1.5 }
  }
}
```

#### Info Panel Rotation (Overlay)
```typescript
// Smooth carousel-style transitions
{
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.5, ease: 'easeInOut' }
}
```

#### Match Win Celebration
```typescript
// Confetti or particle effect
// Team name scales and glows
// "ZWYCIĘZCA!" label animates in
```

---

## Feature Details

### Tournament Setup Flow
1. Create new tournament (name, date)
2. Configure scoring modes per round
3. Add teams manually OR import from CSV/JSON
4. Set bracket positions manually (drag-and-drop or form)
5. Review and start tournament

### Bracket Features
- Visual bracket display with connecting lines
- Support for byes (empty first-round slots)
- Third-place match automatically created from semifinal losers
- Manual override: admin can reassign any team to any slot
- "What-if" preview: see potential future matchups

### Match Management
- Pre-match: Teams assigned, waiting to start
- Live: Score tracking active, real-time updates
- Paused: Timer stopped (if applicable)
- Completed: Winner determined, advances in bracket

### Import/Export
- Import teams from CSV: `name,shortName,color`
- Import bracket layout from JSON
- Export tournament results to CSV/JSON

### Admin protections & confirmations
- The system is intentionally flexible and allows admins to edit nearly any state; sensitive, non-normal, or destructive changes should be protected by explicit confirmation dialogs rather than removed.
- Typical guarded actions:
  - Editing a **completed** match (changing sets, points, winner, or resetting the match)
  - Forcing or manually setting a **match winner**
  - Deleting a **match**, **team**, or **tournament**
  - Overwriting the current bracket via **import** or bulk operations
  - Swapping teams in a match that has already completed or been finalized
  - Resetting the entire tournament state or running batch destructive operations
- UX guidance:
  - Use a clear modal with **title**, a short **explanation of impact**, and an **explicit confirmation action** (e.g., “Tak, potwierdzę zmianę” / “Yes, I confirm”). For these boxes **don't** include keyboard shortcuts.
  - Optionally allow an admin-level **preference** to reduce confirmations for trusted users, but keep a conservative default (confirmations ON).
  - Emit an audit-style toast and server-side log entry for protected actions (who, what, when) to help troubleshooting and rollbacks.

---

## Implementation Status

**For detailed task tracking, see [`PROJECT_TODO.md`](./PROJECT_TODO.md)** - all work phases, completed features, and remaining tasks are documented there.

This section provides an overview of the implementation phases. Detailed TODO items with checkboxes should be maintained in `PROJECT_TODO.md` only.

### High-Level Phases Overview

1. **Phase 1: Project Foundation** ✅ Complete
   - Repository, Vite, Express, Socket.io, SQLite, Drizzle setup
   - Development environment configured

2. **Phase 2: Core Backend** 🔄 In Progress
   - Team service ✅ | Bracket service ✅ | Match service ✅
   - Tournament service ❌ | Player service ❌
   - Scoring service (sets mode ✅, timed mode ❌)

3. **Phase 3: Shared Infrastructure** ✅ Mostly Complete
   - Socket.io context with reconnect ✅
   - Zustand stores ✅
   - React Router ✅
   - Toast notifications ✅

4. **Phase 4: Admin Interface** ✅ Core Complete
   - Dashboard ✅ | Teams Manager ✅ | Bracket Editor ✅ | Match Control ✅
   - Tournament setup wizard ❌ | Player management ❌

5. **Phase 5: Display Views** 🔄 In Progress
   - Fan View ✅ (with sets, needs next-match preview)
   - Bracket Display ✅
   - Player View ❌

6. **Phase 6: OBS Overlay** 🔄 In Progress
   - Score bar with animations ✅
   - Info rotator ❌ | Celebration animations ❌ | Configuration page ❌

7. **Phase 7: Polish & Testing** 🔄 In Progress
   - Keyboard shortcuts ✅ | Toast notifications ✅
   - Undo/redo ❌ | Mobile responsive ❌ | Cross-browser testing ❌

8. **Phase 8: Production & Documentation** ❌ Not Started
   - Combined build ❌ | Polish documentation ❌ | Deployment guide ❌

---

## Notes & Considerations

1. **Byes Handling**: When team count isn't power of 2, higher-seeded teams get byes. Manual bracket import handles this naturally.

2. **Third Place Match**: Automatically created when both semifinals complete. Admins can skip if not needed.

3. **Concurrent Editing**: Score operations are atomic on server. UI shows "live" indicator when another admin is viewing same match.

4. **OBS Integration**: Overlay page uses `?transparent=true` query param. Works with OBS Browser Source (recommended: 1920x1080, custom CSS for any adjustments).

5. **Backup Strategy**: SQLite file can be manually copied. Consider adding auto-backup before tournament starts.

6. **Future Enhancements** (not in scope but designed for):
   - Multi-tournament support
   - Historical statistics
   - Player substitutions
   - Timeout tracking
   - Multi-language support
