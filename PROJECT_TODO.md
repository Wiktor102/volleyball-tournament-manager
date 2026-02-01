# TODO – brakujące funkcje (wg `plan.md` + aktualny stan repo)

Poniżej lista rzeczy, które nadal są **niezaimplementowane** lub są tylko w wersji „demo”, oraz proponowana kolejność prac (od najważniejszych dla użyteczności).

## 0) Status „zrobione” (dla kontekstu)
- [x] Full-stack dev: Vite (5173) + Express/Socket.io (5174)
- [x] SQLite + Drizzle + migracje
- [x] Minimalny loop realtime: utworzenie „meczu demo” + inkrement/dekrement punktów
- [x] Widoki: `/admin`, `/display/fan`, `/overlay` (podstawowe)

## 1) Braki krytyczne – żeby to było „turniejowe”, nie demo
### Turniej / drużyny / zawodnicy (CRUD)
- [x] Socket.io: dodać `team:*` eventy (create/update/delete/list)
- [x] Backend: TeamService – update/delete + walidacja Zod
- [ ] Backend: PlayerService (CRUD) + eventy
- [x] Frontend: Teams Manager (`/admin/teams`) – lista + dodawanie/edycja/usuwanie

### Drabinka single-elimination + 3. miejsce
- [x] Backend: BracketService
  - [x] generowanie drabinki z N drużyn (byes do potęgi 2)
  - [x] modelowanie `nextMatchId` i propagacja zwycięzcy
  - [ ] automatyczne utworzenie meczu o 3. miejsce (po zakończeniu półfinałów)
- [x] Socket.io: `bracket:*` eventy (`bracket:updated`, `admin:bracket:assign`, `admin:bracket:swap`)
- [x] Frontend: Bracket Editor (`/admin/bracket`) – manualne przypisania (na start: forma bez drag&drop)
- [x] Frontend: Bracket Display (`/display/bracket`) – widok tylko do odczytu

### Mecze „realne” (nie demo)
- [x] Backend: MatchService – start/end/reset, wybór zwycięzcy, aktualizacja statusu `pending/live/completed`
- [x] Socket.io: `admin:match:start`, `admin:match:end`, `admin:match:reset`
- [ ] Frontend: Match Control (`/admin/match/:id`) – pełnoekranowa kontrola meczu

## 2) Scoring (zgodnie z planem)
- [ ] `scoring.service.ts` – tryby:
  - [ ] `points` (już częściowo)
  - [ ] `sets` (sety + punkty, warunek przewagi, tie-break)
  - [ ] `timed` (czas, overtime/"golden")
- [ ] Persist scoring config per round (np. w `tournaments.settings` albo osobnej tabeli)
- [ ] UI: konfiguracja scoringu w kreatorze turnieju

## 3) Widoki i overlay (feature-complete)
- [ ] Fan view: sety + historia setów + „następny mecz”
- [ ] Player view (`/display/player`) – „gracie następni” + pozycja w drabince
- [ ] Overlay: prawdziwy ScoreBar (nazwy/kolory/sety/punkty) + animacje zmian
- [ ] Overlay: Info rotator (następny mecz / mini-drabinka / komunikaty)
- [ ] Overlay config (`/overlay/config`): pozycje/kolory/widoczność/tempo rotacji

## 4) Stabilność realtime i współbieżność
- [ ] Reconnect + state sync: po reconnect wysyłać snapshot (`tournament:state`) i re-join rooms
- [ ] Konflikty wielu adminów:
  - [ ] wskaźniki „kto edytuje” (soft-lock lub presence)
  - [ ] optimistic UI tylko tam gdzie ma sens
- [ ] Obsługa błędów i UX: toasty/komunikaty

## 5) Jakość i „polish”
- [ ] Keyboard shortcuts (np. A/L – punkt dla lewej/prawej)
- [ ] Undo/redo (co najmniej dla scoringu)
- [ ] Mobile-responsive admin
- [ ] Cross-browser + test na wielu urządzeniach LAN

## 6) Produkcja i dokumentacja
- [ ] Produkcyjny build/serve (frontend z backendu) + instrukcja uruchomienia na LAN
- [ ] Dokumentacja użytkowa po polsku + „getting started”
- [ ] Test „portable” (USB) – ścieżki względne do DB, brak zależności od internetu

---

# Plan prac (co robię teraz)
1. Implementacja Teams (CRUD + eventy + `/admin/teams`) – daje realne dane zamiast "Drużyna 1/2".
2. Minimalna drabinka + przypisanie drużyn + start meczu z drabinki.
3. Match Control (`/admin/match/:id`) i domknięcie cyklu meczu.
