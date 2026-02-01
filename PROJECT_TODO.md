# TODO - brakujace funkcje (wg `plan.md` + aktualny stan repo)

Ponizej lista rzeczy, ktore nadal sa **niezaimplementowane** lub sa tylko w wersji demo, oraz proponowana kolejnosc prac (od najwazniejszych dla uzytecznosci).

## 0) Status "zrobione" (dla kontekstu)
- [x] Full-stack dev: Vite (5173) + Express/Socket.io (5174)
- [x] SQLite + Drizzle + migracje
- [x] Spojny system stylow CSS (dark theme, admin.css)
- [x] Usunieto mecze demo - wszystkie mecze sa czescia drabinki
- [x] Widoki: `/admin`, `/display/fan`, `/overlay` (podstawowe)
- [x] Toast notifications dla bledow/sukcesu
- [x] Reconnect + state sync (automatyczne odswiezanie po reconnect)
- [x] Mecz o 3. miejsce (auto-tworzony po zakonczeniu polfinaow)
- [x] Scoring z setami (auto-detekcja wygranego seta, tie-break)

## 1) Braki krytyczne - zeby to bylo "turniejowe", nie demo
### Turniej / druzyny / zawodnicy (CRUD)
- [x] Socket.io: dodac `team:*` eventy (create/update/delete/list)
- [x] Backend: TeamService - update/delete + walidacja Zod
- [ ] Backend: PlayerService (CRUD) + eventy
- [x] Frontend: Teams Manager (`/admin/teams`) - lista + dodawanie/edycja/usuwanie

### Drabinka single-elimination + 3. miejsce
- [x] Backend: BracketService
  - [x] generowanie drabinki z N druzyn (byes do potegi 2)
  - [x] modelowanie `nextMatchId` i propagacja zwyciezcy
  - [x] automatyczne utworzenie meczu o 3. miejsce (po zakonczeniu polfinaow)
- [x] Socket.io: `bracket:*` eventy (`bracket:updated`, `admin:bracket:assign`, `admin:bracket:swap`)
- [x] Frontend: Bracket Editor (`/admin/bracket`) - manualne przypisania (na start: forma bez drag&drop)
- [x] Frontend: Bracket Display (`/display/bracket`) - widok tylko do odczytu

### Mecze (pelna funkcjonalnosc)
- [x] Backend: MatchService - start/end/reset, wybor zwyciezcy, aktualizacja statusu `pending/live/completed`
- [x] Socket.io: `admin:match:start`, `admin:match:end`, `admin:match:reset`
- [x] Frontend: Match Control (`/admin/match/:id`) - pelnoekranowa kontrola meczu

## 2) Scoring (zgodnie z planem)
- [x] `scoring.service.ts` - tryby:
  - [x] `points` (proste punkty)
  - [x] `sets` (sety + punkty, warunek przewagi 2 punktow, tie-break do 15)
  - [ ] `timed` (czas, overtime/"golden")
- [ ] Persist scoring config per round (np. w `tournaments.settings` albo osobnej tabeli)
- [ ] UI: konfiguracja scoringu w kreatorze turnieju

## 3) Widoki i overlay (feature-complete)
- [x] Fan view: sety + historia setow
- [ ] Fan view: "nastepny mecz" info
- [ ] Player view (`/display/player`) - "gracie nastepni" + pozycja w drabince
- [x] Overlay: ScoreBar z setami
- [ ] Overlay: animacje zmian wynikow
- [ ] Overlay: Info rotator (nastepny mecz / mini-drabinka / komunikaty)
- [ ] Overlay config (`/overlay/config`): pozycje/kolory/widocznosc/tempo rotacji

## 4) Stabilnosc realtime i wspolbieznosc
- [x] Reconnect + state sync: po reconnect wysylac snapshot (`tournament:state`) i re-join rooms
- [ ] Konflikty wielu adminow:
  - [ ] wskazniki "kto edytuje" (soft-lock lub presence)
  - [ ] optimistic UI tylko tam gdzie ma sens
- [x] Obsluga bledow i UX: toasty/komunikaty

## 5) Jakosc i "polish"
- [x] Keyboard shortcuts (np. A/L - punkt dla lewej/prawej)
- [ ] Undo/redo (co najmniej dla scoringu)
- [ ] Mobile-responsive admin
- [ ] Cross-browser + test na wielu urzadzeniach LAN

## 6) Produkcja i dokumentacja
- [ ] Produkcyjny build/serve (frontend z backendu) + instrukcja uruchomienia na LAN
- [ ] Dokumentacja uzytkowa po polsku + "getting started"
- [ ] Test "portable" (USB) - sciezki wzgledne do DB, brak zaleznosci od internetu

---

# Plan prac (co robię teraz)
1. Usunieto mecze demo - wszystkie mecze sa czescia turnieju
2. Przepracowano Dashboard z workflow i nawigacja
3. Dodano spojny system stylow (admin.css)
4. Mecz o 3. miejsce auto-tworzony po polfinaach
5. Toast notifications
6. Reconnect + state sync
7. Scoring z setami (auto-detekcja wygranego seta)
8. Fan view i overlay wyswietlaja sety
9. Kolejne kroki: overlay animations, player view, timed scoring
