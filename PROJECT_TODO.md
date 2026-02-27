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
- [x] Score bar component
  - [x] Team names with colors
  - [x] Sets score display
  - [x] Current points display
  - [x] Score change animations (pop effect with glow)
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

---

## In Progress / Next Priority

### Remaining Work (High Priority)

#### 1. Backend Services
- [x] Tournament service (create, update, delete, list with full CRUD)
- [x] Player service (CRUD + team assignment)
- [x] Scoring service (pluggable modes, persist config per tournament)
- [ ] Tournament socket.io events (admin notifications, live status updates)
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

#### 3. Display Views
- [ ] Fan View enhancements:
  - [ ] Next match preview
  - [ ] Match schedule/history
  - [ ] Current status info
- [ ] Player Info View (/display/player)
  - [ ] Current match status
  - [ ] "You're playing next" indicator
  - [ ] Team roster
  - [ ] Bracket position
- [ ] Real-time live-sync between views

#### 4. OBS Overlay Enhancements
- [ ] Info rotator component
  - [ ] Next match preview rotation
  - [ ] Mini bracket view
  - [ ] Tournament progress
  - [ ] Custom admin messages
- [ ] Celebration animations
  - [ ] Set win effect
  - [ ] Match win effect
  - [ ] Tournament winner celebration
- [ ] Overlay configuration page (/overlay/config)
  - [ ] Position adjustments
  - [ ] Color/theme overrides
  - [ ] Component visibility toggles
  - [ ] Rotation timing
  - [ ] Animation speed controls

#### 5. Stability & Reliability
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

#### 6. Production & Deployment
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

#### 7. Testing & QA
- [ ] Unit tests for services (bracket, match, scoring)
- [ ] Integration tests for Socket.io events
- [ ] UI component tests (React Testing Library)
- [ ] LAN network testing with multiple devices
- [ ] Load testing (concurrent users)
- [ ] Connection loss / reconnect scenarios
- [ ] Data persistence verification

#### 8. UI Polish & Components
- [ ] Build base UI component library
  - [ ] Button, Input, Select, Modal (enhance existing)
  - [ ] Card, Badge, Tabs (enhance existing)
- [ ] Sound effects (optional, configurable)
- [ ] Add helpful tooltips across the UI

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