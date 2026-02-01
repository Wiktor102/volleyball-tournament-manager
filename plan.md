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

---

## Workplan

### Phase 1: Project Foundation
- [x] Initialize Node.js project with TypeScript
- [x] Set up Vite + React + TypeScript frontend
- [ ] Configure Tailwind CSS with custom theme
- [x] Set up Express server with Socket.io
- [x] Configure SQLite with Drizzle ORM
- [x] Create database schema and migrations
- [x] Set up monorepo scripts (concurrent dev server)

### Phase 2: Core Backend
- [ ] Implement database models and services
  - [ ] Tournament service (CRUD)
  - [x] Team service (CRUD)
  - [ ] Player service (CRUD)
  - [x] Bracket service (generation, updates)
  - [x] Match service (CRUD, score management)
  - [ ] Scoring service (pluggable scoring modes)
- [ ] Implement Socket.io event handlers
  - [ ] Tournament events
  - [ ] Match events (score updates, status)
  - [x] Bracket events
  - [x] Team events
- [ ] Add conflict resolution for concurrent edits

### Phase 3: Shared Infrastructure
- [x] Create Socket.io React context and hooks
- [x] Implement Zustand stores with Socket.io sync
- [ ] Build base UI component library
  - [ ] Button, Input, Select, Modal
  - [ ] Card, Badge, Tabs
  - [ ] Loading states, error boundaries
- [x] Set up React Router with route structure

### Phase 4: Admin Interface
- [ ] Admin Dashboard page
  - [ ] Tournament overview
  - [ ] Quick actions panel
  - [ ] Current/next match preview
- [ ] Tournament Setup wizard
  - [ ] Basic info form
  - [ ] Scoring mode configuration
  - [ ] Team management (add/edit/remove)
  - [ ] Team import (CSV/JSON)
- [ ] Bracket Editor page
  - [ ] Visual bracket display
  - [ ] Manual team assignment
  - [ ] Drag-and-drop support
  - [ ] Bye slot handling
- [x] Match Control page
  - [x] Large score display
  - [x] Increment/decrement buttons
  - [ ] Set management
  - [ ] Timer controls (for timed mode)
  - [ ] Undo functionality
  - [x] End match / advance winner
- [x] Teams Manager page
  - [x] Team list with edit/delete
  - [ ] Player management per team
  - [x] Team color picker

### Phase 5: Display Views
- [ ] Fan View (big screen display)
  - [x] Large score display
  - [ ] Set history
  - [ ] Next match preview
  - [x] Auto-refresh on match change
- [ ] Player Info View
  - [ ] Current match status
  - [ ] "You're playing next" indicator
  - [ ] Bracket position
- [x] Bracket Display (full-screen)
  - [x] Complete bracket visualization
  - [x] Live result updates
  - [x] Winner highlighting

### Phase 6: OBS Streaming Overlay
- [x] Overlay page with transparent background
- [ ] Score bar component
  - [ ] Team names with colors
  - [ ] Set score
  - [ ] Current points
  - [ ] Score change animations
- [ ] Info rotator component
  - [ ] Next match preview
  - [ ] Mini bracket view
  - [ ] Tournament progress
  - [ ] Custom messages (admin-configurable)
- [ ] Celebration animations
  - [ ] Set win effect
  - [ ] Match win effect
  - [ ] Tournament winner celebration
- [ ] Overlay configuration page
  - [ ] Position adjustments
  - [ ] Color/theme overrides
  - [ ] Component visibility toggles
  - [ ] Rotation timing

### Phase 7: Polish & Testing
- [ ] Add keyboard shortcuts for score control
- [ ] Implement undo/redo for admin actions
- [ ] Add sound effects (optional, configurable)
- [ ] Comprehensive error handling
- [ ] Connection loss handling (reconnect + state sync)
- [ ] Mobile-responsive admin interface
- [ ] Cross-browser testing (Chrome, Firefox, Edge)
- [ ] LAN network testing with multiple devices

### Phase 8: Documentation & Deployment
- [ ] Write usage documentation (Polish)
- [ ] Create "getting started" guide
- [ ] Add helpful tooltips in UI
- [ ] Create production build scripts
- [ ] Test portable deployment (USB drive scenario)

---

## Technical Considerations

### Offline/LAN Resilience
- SQLite database ensures data persists locally
- No external dependencies required after install
- Frontend served from same server (no CORS issues)
- Automatic reconnection on network hiccups

### Performance
- Socket.io rooms limit unnecessary broadcasts
- Database queries optimized with indexes
- Frontend uses React.memo for expensive renders
- Animations use GPU-accelerated CSS transforms

### Extensibility Points
- Scoring modes implemented as strategy pattern (easy to add new modes)
- UI components are composable and reusable
- Socket events follow consistent naming convention
- Database schema allows for future features (statistics, history)

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
