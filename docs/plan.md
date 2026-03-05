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
│   │   │   ├── bracket.ts       # Bracket events
│   │   │   └── event.ts         # Match event logging (ace, etc.)
│   │   └── middleware.ts        # Socket middleware
│   │
│   ├── services/
│   │   ├── tournament.service.ts
│   │   ├── match.service.ts
│   │   ├── team.service.ts
│   │   ├── bracket.service.ts
│   │   ├── scoring.service.ts   # Scoring logic (extensible)
│   │   └── event.service.ts     # Match event CRUD & stats aggregation
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
│   │   │   ├── MatchTimer.tsx
│   │   │   └── EventPanel.tsx       # Match event buttons (ace, etc.)
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
│   │       ├── EventBanner.tsx      # Event-triggered animation banner
│   │       └── animations/          # Framer Motion variants
│   │
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── Dashboard.tsx        # Main admin hub
│   │   │   ├── TournamentSetup.tsx  # Create/configure tournament
│   │   │   ├── BracketEditor.tsx    # Manual bracket editing
│   │   │   ├── MatchControl.tsx     # Live match control
│   │   │   ├── TeamsManager.tsx     # Manage teams/players
│   │   │   ├── PlayerStats.tsx      # Player stats management (optional)
│   │   │   └── Settings.tsx         # Tournament settings
│   │   │
│   │   ├── display/
│   │   │   ├── FanView.tsx          # Big screen for audience
│   │   │   ├── PlayerInfo.tsx       # Player-focused display
│   │   │   ├── BracketDisplay.tsx   # Full bracket screen
│   │   │   ├── UpcomingMatches.tsx  # Schedule display
│   │   │   └── StatsView.tsx        # Public match/team/player stats
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
│ color           │       │ jersey_number   │
│ seed            │       │ position        │
│ eliminated      │       │ created_at      │
│ created_at      │       └─────────────────┘
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

                       │
                       │ 1:N
                       ▼
┌─────────────────────────────────────────────┐
│               MatchEvent                     │
├─────────────────────────────────────────────┤
│ id (PK)                                      │
│ match_id (FK)                                │
│ event_type (ace|ball_out|challenge|           │
│             net_touch|block|timeout|custom)   │
│ team (team1|team2)                           │
│ player_id (FK, nullable)                     │
│ set_number                                   │
│ team1_score_at (snapshot)                    │
│ team2_score_at (snapshot)                    │
│ metadata (JSON, nullable)                    │
│ created_at                                   │
└─────────────────────────────────────────────┘
```

> **Player columns** `jersey_number` (integer, nullable) and `position` (text, nullable) are optional and only meaningful when the tournament has player stats tracking enabled (`settings.playerStatsEnabled`). The `MatchEvent.player_id` is also optional — events can be logged team-level without attributing to a specific player.

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

// Match events (for overlay animations & stats)
'match:event'              // New match event logged (ace, challenge, etc.)
'match:event:deleted'      // Match event removed (undo)
'match:events:cleared'     // All events for match cleared
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

// Match event actions
'admin:event:log'          // Log a match event (ace, ball-out, etc.)
'admin:event:delete'       // Remove a logged event (undo)
'admin:event:clear'        // Clear all events for a match

// Stats queries (read-only, anyone can request)
'stats:match:get'          // Get events/stats for a match
'stats:team:get'           // Get aggregated stats for a team
'stats:player:get'         // Get aggregated stats for a player
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

> **Note:** Admin interface components such as “more”/kebab menus use a small SVG icon rather than a text ellipsis to avoid invisible glyphs on some systems, and dropdowns are kept inside non‑scrollable containers (or replaced with inline button groups) to prevent clipping when viewing the bracket navigator.

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
│  ┌─ ZDARZENIA ──────────────────────────────────────────┐   │
│  │                                                       │   │
│  │   Drużyna A:                    Drużyna B:            │   │
│  │   [🏐 As]  [🚫 Aut]            [🏐 As]  [🚫 Aut]    │   │
│  │   [🖐 Blok] [📛 Siatka]        [🖐 Blok] [📛 Siatka] │   │
│  │   [📢 Challange]               [📢 Challange]        │   │
│  │                                                       │   │
│  │   Ostatnie: As serwisowy (A) 0:42  [↩ Cofnij]        │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│    ┌──────────────────────────────────────────────────────┐ │
│    │  [🔄 Resetuj set]  [⏪ Cofnij]  [🏆 Zakończ mecz]     │ │
│    └──────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

> **Event panel UX notes:**
> - The event panel is **collapsible** (toggle button in the info bar) so it does not clutter the UI when not needed. Default state: collapsed on mobile, expanded on desktop/tablet.
> - Each event type is a small **icon button with a short label** beneath it (e.g., "As", "Aut"). The buttons are arranged in two mirrored columns — one per team — so the admin taps the event on the correct team side.
> - Tapping an event button immediately logs it (no extra confirmation). A **toast + "Ostatnie" row** shows the last logged event with an inline undo button, allowing quick correction.
> - When player stats tracking is enabled for the tournament, tapping an event button opens a **quick player picker** (list of jersey numbers for that team) before logging. If disabled, events are logged at team level only.
> - On narrow screens (portrait phones), event buttons wrap into a **scrollable chip row** to avoid vertical overflow.
> - The event panel visibility is controlled by a **tournament setting** (`settings.matchEventsEnabled`). When disabled, the panel is hidden entirely and no event-related socket traffic is generated.

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

#### Match Event Animations (Overlay)
When a match event is logged by the admin, the overlay displays a short animated banner that slides in and fades out after ~3 seconds. Events queue so they don't overlap.

```typescript
// Event banner — slides in from the side of the team that triggered it
{
  initial: { x: teamSide === 'team1' ? -300 : 300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit:    { opacity: 0, scale: 0.8 },
  transition: { type: 'spring', stiffness: 200, damping: 20 }
}

// Banner content varies by event type:
// ace         → "🏐 AS SERWISOWY!" + team name + optional player name
// ball_out    → "🚫 AUT!" + team name
// challenge   → "📢 CHALLANGE!" + brief pause animation
// net_touch   → "📛 DOTKNIĘCIE SIATKI!" + team name
// block       → "🖐 BLOK!" + team name + optional player
// timeout     → "⏸ CZAS!" + team name
// custom      → admin-defined text

// Auto-dismiss after 3s, or admin can configure duration per event type
// Banner position: just below the score bar (same width), z-index above all
```

```typescript
// Challenge event has a special extended animation:
// 1. "CHALLANGE!" banner slides in with suspense effect
// 2. Pulsing glow for 2-3s while decision pending
// 3. Result overlay: "UDANY ✓" or "NIEUDANY ✗" with color coding
// (Challenge result is stored in event metadata)
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
- New default "Bracket View": per-round accordion columns with completion summary (`x/y ukończono`)
- Classic horizontal round columns retained as optional "Classic View" toggle (persisted in `localStorage`)
- Auto-expand behavior: first unfinished round opens by default and remembers manually expanded rounds
- Slim match cards: two team rows, right-aligned score, compact status pill, winner accent border
- Waiting-slot lineage hints for unknown teams (e.g. winner source from previous round)
- Public UX upgrades: sticky round/tournament bar on mobile/tablet, swipe left/right to change rounds, and optional wide-screen tree connectors (`>=1440px`)
- Third-place match rendered in its own section below the Final in both views

### Match Management
- Pre-match: Teams assigned, waiting to start
- Live: Score tracking active, real-time updates
- Paused: Timer stopped (if applicable)
- Completed: Winner determined, advances in bracket

### Match Events & Overlay Animations
Match events are in-game occurrences (service ace, ball-out, challenge, net-touch, block, timeout) that the admin can log during a live match. They serve two purposes: triggering real-time animated banners on the OBS overlay, and accumulating statistics.

- **Event types** (built-in): `ace` (as serwisowy), `ball_out` (aut), `challenge` (challange/wyzwanie), `net_touch` (dotknięcie siatki), `block` (blok), `timeout` (czas). A `custom` type allows free-text admin messages.
- **Logging flow**: Admin taps an event button on the correct team side in the Match Control panel. If player stats tracking is enabled, a quick player picker appears. The event is saved with a score snapshot (team1/team2 points at that moment) and set number.
- **Overlay reaction**: When the overlay receives a `match:event` socket event it displays an animated banner (see *Match Event Animations* above). Events queue to avoid overlap. Banner style, duration, and position are configurable from the overlay config page.
- **Undo**: The most recent event can be undone from the match control panel. This removes it from the database and broadcasts a `match:event:deleted` event so the overlay can dismiss any active banner for that event.
- **Feature toggle**: The entire event system is controlled by the tournament setting `matchEventsEnabled` (default: `true`). When disabled, the event panel is hidden from the match control UI and no event-related data is stored.

### Fan View — Tournament Tracking Hub (`/display/fan`)
The fan view is a dedicated full-page spectator screen for tracking tournament progress in real time.

- **Primary purpose**: One place for fans to follow the tournament without admin controls.
- **Core blocks**: Current live match, next match preview, and schedule/history of recent and upcoming matches.
- **Status context**: Clear tournament/match state indicators (live, paused, completed) and timing context.
- **Stats access**: Fan view must include a visible path to tournament stats (link/button to `/display/stats`) and may show compact live stat summaries.
- **Realtime behavior**: All modules auto-refresh through socket events (score, status, bracket, and stats where enabled).

### Player Info View (`/display/player`)
Player view is a separate display route focused on teams and players preparing to play.

- **Current match status**: Shows what is happening now on court.
- **Next-up indicator**: Highlights when a team/player is expected to play next.
- **Team context**: Displays roster and bracket position.
- **Realtime behavior**: Syncs live with admin actions and tournament state changes.

### Player Stats (Optional per Tournament)
Player statistics are derived from match events attributed to individual players. This feature is **optional** and controlled by a tournament setting `playerStatsEnabled` (default: `false`).

- **When enabled**:
  - The `Player` table's `jersey_number` and `position` fields become editable in the Teams Manager.
  - Event logging in Match Control shows a player picker after tapping an event button.
  - Stats are aggregated from the `MatchEvent` table (count of aces, blocks, etc. per player across the tournament).
  - A dedicated **Player Stats admin page** (`/admin/stats`) allows viewing and manually correcting per-player stats.
  - Public stats views become available (see below).

- **When disabled**:
  - Event buttons still work (if `matchEventsEnabled` is true) but log events at team level only — no player attribution.
  - Player picker is not shown.
  - The player stats admin page is hidden from navigation.
  - Jersey number and position fields are hidden from the Teams Manager.

- **Stats aggregation**: Stats are computed on-the-fly from `MatchEvent` rows (no separate stats table). Queries group by `player_id` and `event_type`, filtered by tournament/match/team. This keeps the data source single and consistent — editing or deleting events automatically updates stats.

### Public Stats Endpoints
When player stats are enabled, additional public display routes become available:

- **`/display/stats`** — Tournament stats dashboard showing:
  - Top players by category (most aces, most blocks, etc.)
  - Team comparison charts (events per team)
  - Per-match event timeline
- **`/display/stats/team/:id`** — Single team stats breakdown
- **`/display/stats/player/:id`** — Single player stats card

These pages are read-only and auto-refresh via socket events. They can be shown on secondary screens or linked from the fan view. When `playerStatsEnabled` is `false`, these routes show a "Statystyki graczy nie są włączone" message.

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
   - Undo/redo ❌ | Mobile responsive ✅ (match control) | Cross-browser testing ❌

8. **Phase 8: Production & Documentation** ❌ Not Started
   - Combined build ❌ | Polish documentation ❌ | Deployment guide ❌

9. **Phase 9: Match Events & Player Stats** ✅ Complete
   - Match event logging (DB, service, socket handler) ✅
   - Event panel in Match Control UI ✅
   - Event-triggered overlay animations ✅
   - Player stats (optional per tournament) ✅
   - Public stats display pages ✅

10. **Phase 10: Security** ✅ Complete
    - Password-protected admin panel (`ADMIN_PASSWORD` env var) ✅
    - Server-side token issuance & validation (in-memory, LAN-appropriate) ✅
    - `RequireAuth` component guarding all `/admin/*` routes ✅
    - Login page (`/login`) with Polish UI ✅
    - Logout button in admin top bar ✅
    - Root `/` redirects to `/display/fan` by default ✅

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

7. **Match Events & Stats**: Events are intentionally lightweight — each is a single row with a score snapshot, not a full play-by-play system. The `custom` event type allows admins to broadcast arbitrary messages to the overlay (e.g., "Przerwa techniczna"). Player stats are derived rather than stored separately, which avoids sync issues at the cost of slightly more complex queries. For school tournaments with ~50 matches this is negligible.

8. **Stats Feature Toggle**: The `playerStatsEnabled` flag is designed to be flipped at any point during the tournament. Enabling it mid-tournament simply means earlier matches won't have player-attributed events. Disabling it hides the UI but retains all stored data.
9. **Admin Authentication**: The admin panel is protected by a single shared password stored in `ADMIN_PASSWORD` (env var, defaults to `"admin"`). Authentication uses short-lived random tokens issued by the server and stored in `localStorage`. Tokens live as long as the server process runs (cleared on restart), which is appropriate for a LAN tournament event. Display routes (`/display/*`, `/overlay`) remain publicly accessible — no auth required. The root `/` redirects to the fan view so spectator screens always land on the right page.