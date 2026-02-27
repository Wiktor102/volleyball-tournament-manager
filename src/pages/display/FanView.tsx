import { Link } from 'react-router-dom'
import { useTournamentDisplay } from '../../hooks/useTournamentDisplay'
import type { MatchSummary, Team } from '../../stores/tournament.store'
import '../../styles/admin.css'

// ─── helpers ────────────────────────────────────────────────────────────────

function matchLabel(m: MatchSummary, teams: Team[]) {
  const t1 = teams.find((t) => t.id === m.team1Id)?.name ?? '?'
  const t2 = teams.find((t) => t.id === m.team2Id)?.name ?? '?'
  const round = m.isThirdPlaceMatch ? 'O 3. miejsce' : `Runda ${m.roundNumber}`
  return { t1, t2, round }
}

function StatusBadge({ status }: { status: MatchSummary['status'] }) {
  const map: Record<MatchSummary['status'], { label: string; cls: string }> = {
    pending: { label: 'Oczekuje', cls: 'fan-badge fan-badge--pending' },
    live: { label: 'Na żywo', cls: 'fan-badge fan-badge--live' },
    completed: { label: 'Zakończony', cls: 'fan-badge fan-badge--completed' },
  }
  const { label, cls } = map[status]
  return <span className={cls}>{label}</span>
}

// ─── modules ────────────────────────────────────────────────────────────────

function ModuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fan-module">
      <div className="fan-module-header">{title}</div>
      <div className="fan-module-body">{children}</div>
    </div>
  )
}

// ─── component ──────────────────────────────────────────────────────────────

export function FanView() {
  const {
    tournament,
    teams,
    currentMatch,
    score,
    upcomingMatches,
    recentMatches,
    nextMatch,
    totalMatches,
    completedMatches,
    isConnected,
    isReconnecting,
  } = useTournamentDisplay()

  const team1 = teams.find((t) => t.id === currentMatch?.team1Id)
  const team2 = teams.find((t) => t.id === currentMatch?.team2Id)

  const hasActiveMatch = !!currentMatch?.team1Id && !!currentMatch?.team2Id

  const hasNextMatch =
    nextMatch != null && nextMatch.team1Id != null && nextMatch.team2Id != null

  const progressPct =
    totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0

  const statsEnabled = tournament?.settings?.playerStatsEnabled === true

  return (
    <div className="display-page">
      <div className="display-container">
        {/* ── Header ── */}
        <div className="display-header">
          <h1>🏐 {tournament?.name ?? 'Turniej'}</h1>
          <div className="flex items-center gap-2">
            <span
              className={`status-badge ${
                isConnected ? 'connected' : isReconnecting ? 'reconnecting' : 'disconnected'
              }`}
            >
              {isConnected ? 'Online' : isReconnecting ? 'Łączenie...' : 'Offline'}
            </span>
            <Link to="/display/bracket" className="btn btn-secondary btn-sm">
              Drabinka
            </Link>
            <Link to="/display/player" className="btn btn-secondary btn-sm">
              Zawodnicy
            </Link>
          </div>
        </div>

        {/* ── Module 1: Current live match ── */}
        {hasActiveMatch ? (
          <>
            <div className="live-indicator mb-3" style={{ justifyContent: 'center' }}>
              <span className="live-dot"></span>
              <span style={{ fontSize: 18 }}>MECZ NA ŻYWO</span>
            </div>

            {/* Sets score */}
            {(score?.setsToWin ?? 3) > 1 && (
              <div className="fan-sets">
                <span className="fan-sets-score" style={{ color: team1?.color || undefined }}>
                  {score?.team1Sets ?? 0}
                </span>
                <span className="fan-sets-label">SETY</span>
                <span className="fan-sets-score" style={{ color: team2?.color || undefined }}>
                  {score?.team2Sets ?? 0}
                </span>
              </div>
            )}

            <div className="fan-score">
              <div className="fan-team">
                <div className="fan-team-name" style={{ color: team1?.color || undefined }}>
                  {team1?.name ?? 'DRUŻYNA 1'}
                </div>
                <div className="fan-team-score">{score?.team1CurrentPoints ?? 0}</div>
              </div>

              <div className="fan-vs">:</div>

              <div className="fan-team" style={{ textAlign: 'right' }}>
                <div className="fan-team-name" style={{ color: team2?.color || undefined }}>
                  {team2?.name ?? 'DRUŻYNA 2'}
                </div>
                <div className="fan-team-score">{score?.team2CurrentPoints ?? 0}</div>
              </div>
            </div>

            {/* Set history */}
            {score?.setScores && score.setScores.length > 0 && (
              <div className="fan-set-history">
                {score.setScores.map((s, i) => (
                  <span key={i} className="fan-set-result">
                    Set {i + 1}: <strong>{s.t1}</strong>-<strong>{s.t2}</strong>
                  </span>
                ))}
              </div>
            )}

            <div className="text-center mt-3 text-muted">
              Set {score?.currentSet ?? 1} z {(score?.setsToWin ?? 3) * 2 - 1}
            </div>
          </>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🏐</div>
              <div className="empty-state-text">
                Brak aktywnego meczu. Poczekaj na rozpoczęcie rozgrywki.
              </div>
            </div>
          </div>
        )}

        {/* ── Module 2: Next match preview ── */}
        {hasNextMatch && (
          <ModuleCard title="Następny mecz">
            <NextMatchPreview match={nextMatch!} teams={teams} />
          </ModuleCard>
        )}

        {/* ── Module 3: Schedule / history ── */}
        {(upcomingMatches.length > 0 || recentMatches.length > 0) && (
          <ModuleCard title="Harmonogram i wyniki">
            <ScheduleHistory
              upcoming={upcomingMatches.slice(0, 3)}
              recent={recentMatches.slice(-3)}
              teams={teams}
            />
          </ModuleCard>
        )}

        {/* ── Module 4: Tournament progress ── */}
        {totalMatches > 0 && (
          <ModuleCard title="Postęp turnieju">
            <TournamentProgress
              completed={completedMatches}
              total={totalMatches}
              pct={progressPct}
            />
          </ModuleCard>
        )}

        {/* ── Module 5: Stats entry point ── */}
        <ModuleCard title="Statystyki">
          {statsEnabled ? (
            <div className="fan-stats-enabled">
              <Link to="/display/stats" className="btn btn-primary">
                Zobacz statystyki graczy
              </Link>
            </div>
          ) : (
            <p className="fan-stats-disabled">Statystyki graczy wyłączone.</p>
          )}
        </ModuleCard>
      </div>
    </div>
  )
}

// ─── sub-components ──────────────────────────────────────────────────────────

function NextMatchPreview({ match, teams }: { match: MatchSummary; teams: Team[] }) {
  const { t1, t2, round } = matchLabel(match, teams)
  const team1 = teams.find((t) => t.id === match.team1Id)
  const team2 = teams.find((t) => t.id === match.team2Id)

  return (
    <div className="fan-next-match">
      <span className="fan-next-round">{round}</span>
      <div className="fan-next-teams">
        <span className="fan-next-team" style={{ color: team1?.color || undefined }}>
          {t1}
        </span>
        <span className="fan-next-vs">vs</span>
        <span className="fan-next-team" style={{ color: team2?.color || undefined }}>
          {t2}
        </span>
      </div>
    </div>
  )
}

function ScheduleHistory({
  upcoming,
  recent,
  teams,
}: {
  upcoming: MatchSummary[]
  recent: MatchSummary[]
  teams: Team[]
}) {
  return (
    <div className="fan-schedule">
      {upcoming.length > 0 && (
        <div className="fan-schedule-section">
          <div className="fan-schedule-section-title">Nadchodzące</div>
          {upcoming.map((m) => {
            const { t1, t2, round } = matchLabel(m, teams)
            return (
              <div key={m.id} className="fan-schedule-row">
                <div className="fan-schedule-matchup">
                  <span className="fan-schedule-round">{round}</span>
                  <span className="fan-schedule-teams">
                    {t1} <span className="fan-schedule-sep">vs</span> {t2}
                  </span>
                </div>
                <StatusBadge status={m.status} />
              </div>
            )
          })}
        </div>
      )}

      {recent.length > 0 && (
        <div className="fan-schedule-section">
          <div className="fan-schedule-section-title">Ostatnie wyniki</div>
          {recent.map((m) => {
            const { t1, t2, round } = matchLabel(m, teams)
            const s = m.score
            return (
              <div key={m.id} className="fan-schedule-row">
                <div className="fan-schedule-matchup">
                  <span className="fan-schedule-round">{round}</span>
                  <span className="fan-schedule-teams">
                    {t1} <span className="fan-schedule-sep">vs</span> {t2}
                  </span>
                </div>
                {s != null ? (
                  <span className="fan-schedule-result">
                    {s.team1Sets}:{s.team2Sets}
                  </span>
                ) : (
                  <StatusBadge status={m.status} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TournamentProgress({
  completed,
  total,
  pct,
}: {
  completed: number
  total: number
  pct: number
}) {
  return (
    <div className="fan-progress">
      <div className="fan-progress-label">
        {completed} / {total} meczów rozegranych ({pct}%)
      </div>
      <div className="fan-progress-track">
        <div className="fan-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
