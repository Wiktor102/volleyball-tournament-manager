# PROJECT_TODO.md - Volleyball Tournament Management System

## Completed Features

### Phase 1: Project Setup
- [x] Create repository and initial project structure
- [x] Set up Vite + React + TypeScript frontend
- [x] Set up Express + Socket.io backend
- [x] Configure TypeScript for both frontend and backend
- [x] Set up development environment (concurrent servers)
- [x] Create database schema and migrations
- [x] Set up monorepo scripts (concurrent dev server)

### Phase 2: Core Backend Services
- [x] Team service (CRUD with Zod validation)
- [x] Bracket service (generation with byes, match wiring)
- [x] Match service (start/end/reset, score management)
- [x] Socket.io event handlers (match, bracket, team events)
- [x] Third place match auto-creation after semifinals
- [x] Volleyball scoring with sets (auto-detect 25pt/2-point advantage, tie-break to 15)
- [x] Tournament service (CRUD with settings, list, delete)
- [x] Player service (CRUD + team assignment)

### Phase 3: Shared Infrastructure
- [x] Socket.io React context with reconnect handling
- [x] Zustand stores with Socket.io sync
- [x] React Router v7 setup with all routes
- [x] Toast notification system (Toast.tsx context)
- [x] Automatic state refresh on reconnect

### Phase 4: Admin Interface
- [x] Admin Dashboard page (/admin)
  - [x] Tournament overview with workflow steps
  - [x] Quick stats cards
  - [x] Current/next match preview
  - [x] Navigation to all admin pages
- [x] Teams Manager page (/admin/teams)
  - [x] Team list with edit/delete
  - [x] Add new team form
  - [x] Inline color picker
  - [x] Real-time updates
  - [x] Player management per team (expandable section)
- [x] Bracket Editor page (/admin/bracket)
  - [x] Visual bracket display with sets support
  - [x] Manual team assignment
  - [x] Bye slot handling
  - [x] 3rd place match display
  - [x] Match status controls (start/end/reset)
- [x] Match Control page (/admin/match/:id)
  - [x] Large score display with sets
  - [x] Increment/decrement buttons (A/Q, L/P keyboard shortcuts)
  - [x] Set management (award set, undo set)
  - [x] End match / advance winner controls
- [x] Tournament Setup page (/admin/tournament/:id)
  - [x] Create/edit tournament
  - [x] Scoring mode configuration (sets to win, points per set, tie-break)
  - [x] Tournament status management
  - [x] Delete tournament with typed confirmation

### Phase 5: Display Views
- [x] Fan View (/display/fan)
  - [x] Large score display
  - [x] Sets score prominently displayed
  - [x] Set history with individual set scores
  - [x] Auto-refresh on match change
  - [x] Live indicator
- [x] Bracket Display (/display/bracket)
  - [x] Complete bracket visualization
  - [x] Live result updates
  - [x] Winner highlighting
  - [x] 3rd place match display
- [x] NotFound page for invalid routes

### Phase 6: OBS Streaming Overlay
- [x] Overlay page (/overlay) with transparent background
- [x] Broadcast-grade overlay overhaul (ESPN/Fox Sports style)
  - [x] Dedicated overlay CSS (`src/styles/overlay.css`, ~900 lines, 20+ keyframe animations)
  - [x] Google Fonts loaded (Oswald, Barlow, Barlow Condensed)
  - [x] ScoreBug — compact top-left ESPN-style scorebug with team colors, sets, points flash, LIVE badge
  - [x] EventBlast — full-screen dramatic event animations (directional wipe, icon slam, timeout overlay)
  - [x] CelebrationOverlayNew — particle bursts, shockwave rings, crown icons, gold shimmer for tournament win
  - [x] StatsWidget — rotating stats cards (match comparison, top aces/blocks leaderboard, events summary)
  - [x] LowerThird — bottom info ticker with accent bar, rotating panels (next match, progress, last result)
  - [x] OverlayConfig rewritten with stats widget settings
- [x] Old overlay components removed (EventBanner, InfoRotator, CelebrationOverlay)
- [x] Old overlay CSS removed from admin.css
- [x] Transparent background toggle (?transparent=false)

### Phase 7: UI Styling & Polish
- [x] Comprehensive CSS design system (admin.css)
  - [x] Dark theme with CSS variables
  - [x] Consistent button styles (primary, secondary, success, danger)
  - [x] Card layouts and form elements
  - [x] Status badges with animations
  - [x] Sets display styling
  - [x] Toast notification styling
  - [x] Modal styling for confirmations
- [x] Keyboard shortcuts for score control (A/Q, L/P)
- [x] Toast notifications for all user actions
- [x] Connection status indicators
- [x] Confirmation modals for destructive actions
  - [x] Team deletion
  - [x] Tournament deletion (with typed confirmation)
  - [x] Bracket clearing
  - [x] Match reset
- [x] Kebab menu icon & dropdown overflow fix (admin pages)

### Phase 8: Production & Deployment
- [x] Production start script (npm start)
- [x] Frontend served from Express in production

### Phase 9: Security
- [x] Password auth for admin routes (`ADMIN_PASSWORD` env var, default `"admin"`)
  - [x] Server: `POST /api/auth/login`, `GET /api/auth/check`, `POST /api/auth/logout` (in-memory token set)
  - [x] Client: `src/utils/auth.ts` (login/logout/checkAuth helpers, token in `localStorage`)
  - [x] `src/components/RequireAuth.tsx` — wraps all `/admin/*` routes, redirects to `/login` when unauthenticated
  - [x] `src/pages/LoginPage.tsx` — Polish-language password form
  - [x] Logout button added to admin top bar
  - [x] Root `/` now redirects to `/display/fan` (fan view) instead of `/admin`

---

## In Progress / Next Priority

### Remaining Work (High Priority)

#### 1. Backend Services
- [x] Tournament service (create, update, delete, list with full CRUD)
- [x] Player service (CRUD + team assignment)
- [x] Scoring service (pluggable modes, persist config per tournament)
- [x] Tournament socket.io events (admin notifications, live status updates)
  - [x] `tournament:status:changed` broadcast when status changes
  - [x] `tournament:settings:changed` broadcast when settings change
  - [x] `tournament:admin:notification` general admin notification event
  - [x] `tournament:state` re-broadcast on every update
  - [x] Dashboard toast on status change
- [x] Scoring modes:
  - [x] Points (simple increment)
  - [x] Sets (with auto-win, tie-break)
  - [x] Timed (match timer with pause/resume, countdown)
- [x] Per-round scoring overrides (e.g., final uses timed mode)

#### 2. Admin Features
- [x] Tournament setup wizard / creation flow
  - [x] Basic tournament info (name, status)
  - [x] Scoring mode configuration
  - [x] Team import (CSV/JSON)
  - [x] Bracket generation/import (auto + manual modes)
  - [x] Player management per team
- [x] Dropping shortName (team shortcuts) across the system
- [x] Set management improvements:
  - [x] Manual set score input (direct score setting + inline set editing)
  - [x] Set duration tracking (timestamps per set, live elapsed timer)
  - [x] Highlight current set
- [ ] Undo/redo for admin actions (SKIPPED - existing reset/undo-set controls sufficient)
- [x] Protective confirmations for destructive / non-normal admin actions
  - [x] Confirmation modal for resetting a match
  - [x] Confirmation for forcing / manually setting a **match winner**
  - [x] Confirmation for deleting team/tournament
  - [x] Confirmation when generating a bracket that will **overwrite** existing assignments
  - [x] Confirmation for clearing bracket
  - [x] UX: typed confirmation for very dangerous actions (tournament delete)
  - [x] Add admin preference to opt-out of confirmations (conservative default = enabled)

#### 3. Shared Display Infrastructure
- [x] Shared data model for public display routes (current match, schedule snapshot, tournament status)
  - [x] `MatchSummary` type + extended `TournamentState` with `upcomingMatches`, `recentMatches`, `nextMatch`, `totalMatches`, `completedMatches`
  - [x] `getTournamentState()` extended to populate all new fields
- [x] Reusable socket subscriptions/state sync for all display pages
  - [x] `src/hooks/useTournamentDisplay.ts` — central hook for all display/overlay pages

#### 4. Match Events & Overlay Animations
- [x] Database: `matchEvents` table (id, matchId, eventType, team, playerId, setNumber, score snapshot, metadata, createdAt)
- [x] Database: extend `players` table with `jersey_number` (int, nullable) and `position` (text, nullable)
- [x] Tournament settings: add `matchEventsEnabled` (default true) and `playerStatsEnabled` (default false) flags
- [x] Event service (`server/services/event.service.ts`)
  - [x] `logEvent(matchId, eventType, team, playerId?, metadata?)` — validate, snapshot score, insert
  - [x] `deleteEvent(eventId)` — remove single event (undo)
  - [x] `clearMatchEvents(matchId)` — remove all events for a match
  - [x] `getMatchEvents(matchId)` — list events for a match (ordered by time)
  - [x] `getMatchStats(matchId)` — aggregate event counts by type and team
  - [x] `getTeamStats(tournamentId, teamId)` — aggregate across matches
  - [x] `getPlayerStats(tournamentId, playerId?)` — per-player aggregation
- [x] Socket handler (`server/socket/handlers/event.ts`)
  - [x] `admin:event:log` — log event, broadcast `match:event` to match room
  - [x] `admin:event:delete` — delete event, broadcast `match:event:deleted`
  - [x] `admin:event:clear` — clear events, broadcast `match:events:cleared`
  - [x] `stats:match:get` — return match events/stats (read-only, any client)
  - [x] `stats:team:get` — return team stats
  - [x] `stats:player:get` — return player stats
  - [x] Register handler in `server/socket/handlers/index.ts`
- [x] Zod validation schemas for event payloads (`server/utils/validation.ts`)
- [x] Match Control UI: Event Panel component (`src/components/match/EventPanel.tsx`)
  - [x] Two-column layout (team1 events | team2 events)
  - [x] Icon buttons for each event type (ace, ball-out, challenge, net-touch, block, timeout)
  - [x] Collapsible panel (toggle button in info bar)
  - [x] Default collapsed
  - [x] Quick player picker overlay (when `playerStatsEnabled` is true)
  - [x] "Ostatnie" row showing last logged event with inline undo button
  - [x] Toast confirmation on event log
  - [x] Hide panel entirely when `matchEventsEnabled` is false
- [x] Match Control UI: integrate EventPanel into MatchControl.tsx grid layout
  - [x] Added as collapsible row between score area and footer
  - [x] Players loaded via `player:list` when teams are known

#### 5. Fan View — Tournament Tracking Hub (`/display/fan`)
- [x] Fan page as a dedicated tournament-tracking screen (single-page hub for spectators)
  - [x] Prominent current match module (live score + sets + status)
  - [x] Next match preview
  - [x] Match schedule/history (upcoming + recent results)
  - [x] Current tournament status info (live/paused/completed)
- [x] Fan-facing stats access
  - [x] Add clear entry point to stats views from fan page (`/display/stats`)
  - [x] Show compact stats preview cards on fan page (when enabled)
  - [x] Show fallback message when player stats are disabled
- [x] Real-time live-sync for fan page modules (via `useTournamentDisplay` hook)

#### 6. Player Info View (`/display/player`)
- [x] Current match status (live match banner, highlight when selected team is playing)
- [x] "You're playing next" indicator
- [x] Team roster (player list with jersey number + position)
- [x] Bracket position (completed/upcoming matches for selected team)
- [x] Real-time live-sync (via `useTournamentDisplay` hook)

#### 7. OBS Overlay — Broadcast-Grade Overhaul
- [x] Complete overlay redesign (ESPN/Fox Sports/Polsat Sport style)
  - [x] ScoreBug — compact top-left with team colors, sets, points flash, set history, LIVE badge
  - [x] EventBlast — full-screen dramatic event animations (directional wipe, diagonal lines, icon slam)
  - [x] CelebrationOverlayNew — particle bursts, shockwave rings, crown icon, gold shimmer, phased animation
  - [x] StatsWidget — rotating stats cards every ~30s (match comparison, aces/blocks leaderboard, events summary)
  - [x] LowerThird — bottom info ticker with accent bar, rotating panels (next match, progress bar, last result)
  - [x] Dedicated `src/styles/overlay.css` (~900 lines, 20+ CSS keyframe animations)
  - [x] Google Fonts: Oswald (display), Barlow (body), Barlow Condensed (labels)
  - [x] All event types supported: ace, ball-out, challenge, net-touch, block, timeout
  - [x] Tournament winner celebration with gold particles
  - [x] Timeout gets special full-screen overlay treatment
- [x] OverlayConfig rewritten with stats widget settings (interval, display duration, toggle)
- [x] Old overlay code removed (EventBanner.tsx, InfoRotator.tsx, CelebrationOverlay.tsx, old CSS from admin.css)
- [ ] Challenge event: extended animation with suspense + result display
- [ ] Overlay position adjustments (config)
- [ ] Overlay color/theme overrides (config)
- [ ] Mini bracket view in stats rotation

#### 8. Stability & Reliability
- [ ] Multi-admin conflict resolution
  - [ ] "Typing/editing" indicators (presence)
  - [ ] Soft-lock for exclusive editing
  - [ ] Optimistic UI updates
- [ ] Comprehensive error handling
  - [ ] Network errors with recovery UI
  - [ ] Database errors with logging
  - [ ] Error boundaries and loading states
  - [x] Socket disconnection handling (reconnect with state refresh)
- [x] Mobile-responsive admin interface (match control tablet-first layout)
- [ ] Cross-browser testing (Chrome, Firefox, Edge, Safari)

#### 9. Production & Deployment
- [x] Combine frontend and backend builds
  - [x] Serve React build from Express
  - [ ] Production environment variables
  - [x] Minified assets (Vite build)
- [ ] Create production deployment guide
- [ ] Test portable deployment (USB drive)
  - [ ] Relative database paths
  - [ ] No internet dependency verification
  - [ ] Single-executable bundle (optional)
- [ ] Write Polish documentation
  - [ ] Installation guide
  - [ ] Getting started tutorial
  - [ ] Administrator manual
  - [ ] Troubleshooting guide
- [ ] Add helpful UI tooltips

#### 10. Testing & QA
- [ ] Unit tests for services (bracket, match, scoring)
- [ ] Integration tests for Socket.io events
- [ ] UI component tests (React Testing Library)
- [ ] LAN network testing with multiple devices
- [ ] Load testing (concurrent users)
- [ ] Connection loss / reconnect scenarios
- [ ] Data persistence verification

#### 11. UI Polish & Components
- [ ] Build base UI component library
  - [ ] Button, Input, Select, Modal (enhance existing)
  - [ ] Card, Badge, Tabs (enhance existing)
- [ ] Sound effects (optional, configurable)
- [ ] Add helpful tooltips across the UI

#### 12. Player Stats (Optional per Tournament)
- [x] Teams Manager: show jersey_number and position fields when `playerStatsEnabled` is true
  - [x] Inline editable fields in player list
  - [x] Hide fields when setting is false
- [x] Player Stats admin page (`/admin/stats`)
  - [x] Table of all players with event counts (aces, blocks, etc.)
  - [x] Sortable columns
  - [x] Filter by team
  - [ ] Match-by-match breakdown expandable per player
  - [x] Hide page from navigation when `playerStatsEnabled` is false
- [x] Public stats display page (`/display/stats`)
  - [x] Top players leaderboard (most aces, blocks, etc.)
  - [x] Team comparison (events per team)
  - [ ] Per-match event timeline
  - [x] Auto-refresh via socket events
  - [x] Show "disabled" message when `playerStatsEnabled` is false
- [x] Public team stats page (`/display/stats/team/:id`)
  - [x] Team event breakdown
  - [x] Player roster with stats
- [x] Public player stats page (`/display/stats/player/:id`)
  - [x] Player stats card with all event counts
  - [ ] Match history with events
- [x] Add routes for stats pages in React Router
- [x] Zustand store for events/stats data (`src/stores/event.store.ts`)
- [x] Navigation links: add stats to admin sidebar and display navigation (conditionally)

---

## Current Session Work (Feb 1, 2026)

Completed:
1. ✅ 3rd place match auto-creation after semifinals
2. ✅ Toast notifications system
3. ✅ Reconnect + state sync
4. ✅ Volleyball sets scoring (auto-detect, tie-break)
5. ✅ Fan view with sets display
6. ✅ Overlay score animations
7. ✅ Unified TODO documentation
8. ✅ Tournament service CRUD (create, update, delete, list)
9. ✅ Tournament Setup page with scoring configuration
10. ✅ Player service CRUD
11. ✅ Player management in TeamsManager
12. ✅ Confirmation modals for destructive actions
13. ✅ Production build setup (npm run build && npm start)
14. ✅ Timed scoring mode with timer UI (pause/resume, countdown, overtime display)
15. ✅ Per-round scoring overrides (e.g., final uses timed mode while other rounds use sets)
16. ✅ CSV team import (with player roster support)
17. ✅ Dropped team short names and shortcuts across the system (simplified UI)

## Session Work (Feb 27, 2026)

Completed:
1. ✅ Manual set score input (direct score setting via toggle + inline set history editing)
2. ✅ Set duration tracking (per-set timestamps, live elapsed timer, backward-compatible JSON format)
3. ✅ Current set highlighting in match control
4. ✅ Confirmation for forcing/manually setting match winner
5. ✅ Confirmation when generating bracket that overwrites existing
6. ✅ Admin preference to opt-out of confirmations (localStorage, skips non-critical only)
7. ✅ Kebab menu icon rendering corrected & dropdown overflow bug eliminated
8. ✅ Manual bracket setup (auto/manual generation modes, duplicate prevention in team assignment)

Skipped:
- Undo/redo for admin actions (existing reset/undo-set controls are sufficient)
- Bracket import from file (skipped per user request)

## Session Work (Feb 27, 2026 — continued)

Completed:
9. ✅ Match control tablet-first layout — full-screen CSS grid, no scrolling needed on 7-8" tablets
   - `.match-control-layout` 4-row CSS grid fills viewport minus topbar
   - Fluid `clamp()`-based score font sizes
   - Team names truncated with ellipsis on overflow
   - Set history chips horizontally scrollable when many sets
   - Manual score edit accessible via footer "✎ Wynik" button
   - Portrait mode: teams stack vertically (`@media max-width: 700px`)
   - Short-height landscape mode: extra compression (`@media max-height: 650px`)
   - `.admin-container--match-control` applied by AdminLayout — reduces outer padding to 8px
   - Added missing `.btn-warning` CSS class

## Session Work (Feb 27, 2026 — Phase 2)

Completed:
10. ✅ Tournament socket.io events (status/settings broadcasts, admin notifications)
11. ✅ Shared data model for display routes (`MatchSummary`, extended `TournamentState`, `useTournamentDisplay` hook)
12. ✅ DB schema: `matchEvents` table + `jerseyNumber`/`position` on `players`, migration applied
13. ✅ Event service (`logEvent`, `deleteEvent`, `clearMatchEvents`, `getMatchEvents`, `getMatchStats`, `getTeamStats`, `getPlayerStats`)
14. ✅ Event socket handler (`admin:event:log/delete/clear`, `stats:match/team/player:get`) + Zod validation
15. ✅ EventPanel component — collapsible 2-col panel in MatchControl with player picker, undo, toast
16. ✅ Fan View rewrite — uses `useTournamentDisplay`, schedule/history modules, stats entry point
17. ✅ Player Info View (`/display/player`) — roster with jersey/position, live banner, next-match indicator
18. ✅ OBS overlay enhancements: EventBanner, InfoRotator, CelebrationOverlay (set win + match win)
19. ✅ Overlay config page (`/overlay/config`) — visibility toggles, timing sliders
20. ✅ Player Stats system: admin `/admin/stats` table, public `/display/stats` leaderboard, team/player detail pages
21. ✅ TeamsManager jersey/position inline editing (conditional on `playerStatsEnabled`)
22. ✅ `event.store.ts` Zustand store; conditional Statystyki nav link in AdminLayout
23. ✅ PROJECT_TODO.md audited and checkboxes corrected to reflect actual implementation state

Remaining (not yet implemented):
- Match-by-match breakdown in admin PlayerStats page
- Per-match event timeline in public StatsDisplay
- Match history in public PlayerStatsPage
- Mini bracket view in InfoRotator
- Custom admin messages in InfoRotator
- Challenge extended animation in EventBlast
- Overlay position adjustments and color/theme overrides
- Mini bracket view in stats rotation
- §8 Stability: multi-admin conflict resolution, error boundaries/recovery UI
- §9 Deployment: Polish docs, deployment guide, USB portable test
- §10 Testing: unit/integration/UI tests
- §11 UI Polish: component library, sound effects, tooltips

---

## Session Work (Feb 27, 2026 — Security Update)

Completed:
24. ✅ Password authentication for admin routes
    - `ADMIN_PASSWORD` env variable (defaults to `"admin"` if unset)
    - Server auth endpoints: `/api/auth/login`, `/api/auth/check`, `/api/auth/logout`
    - In-memory token store (cleared on server restart)
    - `src/utils/auth.ts` — shared auth helpers (login, logout, checkAuth, getToken)
    - `RequireAuth` component wraps all `/admin/*` routes
    - `LoginPage` with Polish-language password form
    - Logout button added to admin top bar
    - Root `/` redirects to `/display/fan` by default

## Session Work (Feb 27, 2026 — OBS Overlay Overhaul)

Completed:
25. ✅ Complete OBS overlay redesign — broadcast-grade ESPN/Fox Sports style
    - ScoreBug: compact top-left widget with team colors, sets dots, points flash animation, set history, LIVE badge
    - EventBlast: full-screen dramatic animations with directional wipe, diagonal lines, icon slam, expanding label; timeout special overlay
    - CelebrationOverlayNew: particle bursts, shockwave rings, crown icons, gold shimmer for tournament win, phased enter/visible/exit
    - StatsWidget: rotating stats cards (match comparison, top aces, top blocks, events summary) appearing every ~30s
    - LowerThird: bottom info ticker with accent bar, rotating panels (next match, progress bar, last result, tournament name)
    - Dedicated `src/styles/overlay.css` (~900 lines, 20+ CSS keyframe animations)
    - Google Fonts: Oswald (display), Barlow (body), Barlow Condensed (labels)
    - OverlayConfig rewritten with stats widget settings
    - Old overlay components deleted (EventBanner.tsx, InfoRotator.tsx, CelebrationOverlay.tsx)
    - Old overlay CSS removed from admin.css (~400 lines)
    - Build verified — no TypeScript errors

## Session Work (Mar 4, 2026 — Scoring Rules Rework)

Completed:
26. ✅ Scoring rules rework — `TournamentSetup`
    - Added `tiebreakByTotalPoints` option to `ScoringSettings` type (frontend store + server service)
    - New preset-based scoring UI in `TournamentSetup` (`ScoringPresetSelector` + `RoundOverridesEditor` components)
    - Presets: "2 sety po 11 pkt (punkty decydują)", "Do 2 setów po 15 pkt", "Do 2 setów po 25 pkt", "Na czas", "Własny"
    - `RoundOverridesEditor` fully rewrites the per-round override form with the same preset cards
    - Scoring preset cards CSS added to `admin.css`
27. ✅ `tiebreakByTotalPoints` logic in `match.service.ts` `incrementPoint`
    - When sets are tied at `setsToWin-1` each, winner resolved by total accumulated points
    - If total points also tied → plays an advantage "set" (first to score with mustWinByTwo lead)
28. ✅ Match Control — correct scoring rule integration
    - Sets reset automatically (server-side) after each set is won via `incrementPoint` or `awardSet`
    - `suggestedWinnerId` computed client-side: team that has reached `setsToWin` sets is auto-suggested
    - Winner confirmation is a simple (non-danger) dialog when the team meets the criteria
    - Attempting to declare a winner who hasn't met the criteria shows a warning dialog with the criteria shortfall message
    - Suggested winner banner displayed above win buttons when criteria are met
    - Win button for the suggested winner highlighted with `btn-success`; opponent's button dimmed to `btn-secondary`
    - `tiebreakByTotalPoints` info banner already present (shows totals and "playing advantage set" state)
29. ✅ Fix: `fixed2x11_totalpoints` no longer starts visual 3rd set on equal total points
  - Advantage phase now stays attached to set 2 in `incrementPoint` logic
  - Counters no longer reset when totals tie; live points continue accumulating from the last set score instead of jumping back to 0
  - Deciding points are merged into set 2 score when the advantage phase resolves
30. ✅ Overlay behavior during advantage-stage transition
  - Fullscreen "Set Won" celebration is suppressed when a tied-total set transitions into attached advantage stage
  - Scorebug now shows an explicit `⚡ PRZEWAGA` annotation while advantage stage is active