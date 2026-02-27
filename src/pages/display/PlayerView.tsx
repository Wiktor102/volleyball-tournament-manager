import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTournamentDisplay } from '../../hooks/useTournamentDisplay'
import { useSocket } from '../../socket/context'
import type { MatchSummary, Team } from '../../stores/tournament.store'
import '../../styles/admin.css'

// ─── types ───────────────────────────────────────────────────────────────────

type Player = {
  id: string
  teamId: string
  name: string
  jerseyNumber?: number | null
  position?: string | null
}

type Ack<T> = { ok: true; data: T | null } | { ok: false; error: string }

// ─── helpers ─────────────────────────────────────────────────────────────────

function teamMatchLabel(m: MatchSummary, teams: Team[]) {
  const t1 = teams.find((t) => t.id === m.team1Id)?.name ?? '?'
  const t2 = teams.find((t) => t.id === m.team2Id)?.name ?? '?'
  const round = m.isThirdPlaceMatch ? 'O 3. miejsce' : `Runda ${m.roundNumber}`
  return { t1, t2, round }
}

// ─── sub-components ──────────────────────────────────────────────────────────

function TeamCard({ team, onClick }: { team: Team; onClick: () => void }) {
  return (
    <button className="player-view-team-card" onClick={onClick}>
      <span
        className="player-view-team-color"
        style={{ background: team.color ?? '#64748b' }}
      />
      <span className="player-view-team-card-name">{team.name}</span>
    </button>
  )
}

function PlayerRow({ player }: { player: Player }) {
  const positionLabel = player.position ? ` · ${player.position}` : ''
  return (
    <div className="player-view-player-row">
      <span className="player-view-jersey">
        {player.jerseyNumber != null ? `#${player.jerseyNumber}` : '—'}
      </span>
      <span className="player-view-player-name">
        {player.name}
        {positionLabel && (
          <span className="player-view-player-pos">{positionLabel}</span>
        )}
      </span>
    </div>
  )
}

function LiveMatchBanner({
  currentMatch,
  selectedTeamId,
  teams,
  score,
}: {
  currentMatch: { id: string; team1Id: string | null; team2Id: string | null } | null
  selectedTeamId: string | null
  teams: Team[]
  score: ReturnType<typeof useTournamentDisplay>['score']
}) {
  if (!currentMatch?.team1Id || !currentMatch?.team2Id) return null

  const t1 = teams.find((t) => t.id === currentMatch.team1Id)
  const t2 = teams.find((t) => t.id === currentMatch.team2Id)
  const isMyTeam =
    selectedTeamId != null &&
    (currentMatch.team1Id === selectedTeamId || currentMatch.team2Id === selectedTeamId)

  return (
    <div className={`player-view-live-banner${isMyTeam ? ' player-view-live-banner--mine' : ''}`}>
      <div className="player-view-live-top">
        <span className="player-view-live-dot" />
        <span className="player-view-live-label">
          {isMyTeam ? 'TWOJA DRUŻYNA GRA TERAZ!' : 'MECZ NA ŻYWO'}
        </span>
      </div>
      <div className="player-view-live-matchup">
        <span className="player-view-live-team" style={{ color: t1?.color ?? undefined }}>
          {t1?.name ?? 'Drużyna 1'}
        </span>
        <div className="player-view-live-score">
          <span>{score?.team1CurrentPoints ?? 0}</span>
          <span className="player-view-live-colon">:</span>
          <span>{score?.team2CurrentPoints ?? 0}</span>
        </div>
        <span className="player-view-live-team" style={{ color: t2?.color ?? undefined }}>
          {t2?.name ?? 'Drużyna 2'}
        </span>
      </div>
      {score?.setScores && score.setScores.length > 0 && (
        <div className="player-view-live-sets">
          {score.setScores.map((s, i) => (
            <span key={i} className="player-view-set-chip">
              Set {i + 1}: {s.t1}-{s.t2}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function NextMatchBanner({
  nextMatch,
  selectedTeamId,
  teams,
}: {
  nextMatch: MatchSummary | null
  selectedTeamId: string | null
  teams: Team[]
}) {
  if (!nextMatch?.team1Id || !nextMatch?.team2Id) return null

  const isMyTeam =
    selectedTeamId != null &&
    (nextMatch.team1Id === selectedTeamId || nextMatch.team2Id === selectedTeamId)

  if (!isMyTeam) return null

  const t1 = teams.find((t) => t.id === nextMatch.team1Id)
  const t2 = teams.find((t) => t.id === nextMatch.team2Id)

  return (
    <div className="player-view-next-banner">
      <span className="player-view-next-label">Następna gra:</span>
      <span className="player-view-next-teams">
        <span style={{ color: t1?.color ?? undefined }}>{t1?.name ?? '?'}</span>
        <span className="player-view-next-vs">vs</span>
        <span style={{ color: t2?.color ?? undefined }}>{t2?.name ?? '?'}</span>
      </span>
    </div>
  )
}

function BracketSummary({
  teamId,
  upcomingMatches,
  recentMatches,
  teams,
}: {
  teamId: string
  upcomingMatches: MatchSummary[]
  recentMatches: MatchSummary[]
  teams: Team[]
}) {
  const allMatches = [...recentMatches, ...upcomingMatches].filter(
    (m) => m.team1Id === teamId || m.team2Id === teamId,
  )

  const completed = allMatches.filter((m) => m.status === 'completed')
  const wins = completed.filter((m) => m.winnerId === teamId).length
  const losses = completed.length - wins

  const maxRound = completed.reduce((max, m) => Math.max(max, m.roundNumber), 0)

  const pending = allMatches.filter((m) => m.status === 'pending' || m.status === 'live')

  if (allMatches.length === 0) {
    return (
      <div className="player-view-bracket-empty">
        Brak danych o meczach dla tej drużyny.
      </div>
    )
  }

  return (
    <div className="player-view-bracket">
      <div className="player-view-bracket-stats">
        <div className="player-view-bracket-stat">
          <span className="player-view-bracket-stat-val player-view-bracket-stat-val--win">
            {wins}
          </span>
          <span className="player-view-bracket-stat-label">Wygrane</span>
        </div>
        <div className="player-view-bracket-stat">
          <span className="player-view-bracket-stat-val player-view-bracket-stat-val--loss">
            {losses}
          </span>
          <span className="player-view-bracket-stat-label">Przegrane</span>
        </div>
        {maxRound > 0 && (
          <div className="player-view-bracket-stat">
            <span className="player-view-bracket-stat-val">{maxRound}</span>
            <span className="player-view-bracket-stat-label">Runda</span>
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div className="player-view-bracket-section">
          <div className="player-view-bracket-section-title">Rozegrane mecze</div>
          {completed.map((m) => {
            const { t1, t2, round } = teamMatchLabel(m, teams)
            const won = m.winnerId === teamId
            return (
              <div key={m.id} className="player-view-bracket-row">
                <div className="player-view-bracket-row-meta">
                  <span className="player-view-bracket-round">{round}</span>
                  <span className="player-view-bracket-matchup">
                    {t1} <span className="player-view-sep">vs</span> {t2}
                  </span>
                </div>
                <div className="player-view-bracket-outcome">
                  {m.score != null && (
                    <span className="player-view-bracket-sets">
                      {m.score.team1Sets}:{m.score.team2Sets}
                    </span>
                  )}
                  <span
                    className={`player-view-outcome-badge ${
                      won
                        ? 'player-view-outcome-badge--win'
                        : 'player-view-outcome-badge--loss'
                    }`}
                  >
                    {won ? 'Wygrana' : 'Przegrana'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pending.length > 0 && (
        <div className="player-view-bracket-section">
          <div className="player-view-bracket-section-title">Nadchodzące mecze</div>
          {pending.map((m) => {
            const { t1, t2, round } = teamMatchLabel(m, teams)
            return (
              <div key={m.id} className="player-view-bracket-row">
                <div className="player-view-bracket-row-meta">
                  <span className="player-view-bracket-round">{round}</span>
                  <span className="player-view-bracket-matchup">
                    {t1} <span className="player-view-sep">vs</span> {t2}
                  </span>
                </div>
                <span className="player-view-next-chip">Następny</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function PlayerView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTeamId = searchParams.get('team')

  const { socket } = useSocket()

  const {
    tournament,
    teams,
    currentMatch,
    score,
    upcomingMatches,
    recentMatches,
    nextMatch,
    isConnected,
    isReconnecting,
  } = useTournamentDisplay()

  const [players, setPlayers] = useState<Player[]>([])
  const [playersLoading, setPlayersLoading] = useState(false)

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null

  // Fetch player list when team changes
  useEffect(() => {
    if (!socket || !selectedTeamId) {
      setPlayers([])
      return
    }
    setPlayersLoading(true)
    socket.emit('player:list', { teamId: selectedTeamId }, (ack: Ack<Player[]>) => {
      setPlayersLoading(false)
      if (ack.ok && ack.data) {
        setPlayers(ack.data)
      } else {
        setPlayers([])
      }
    })
  }, [socket, selectedTeamId])

  function selectTeam(teamId: string) {
    setSearchParams({ team: teamId })
  }

  function clearTeam() {
    setSearchParams({})
  }

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
            <Link to="/display/fan" className="btn btn-secondary btn-sm">
              Wyniki
            </Link>
          </div>
        </div>

        {/* ── Live match banner ── */}
        <LiveMatchBanner
          currentMatch={currentMatch}
          selectedTeamId={selectedTeamId}
          teams={teams}
          score={score}
        />

        {/* ── Next match banner (only when team selected and it's theirs) ── */}
        {selectedTeamId && (
          <NextMatchBanner
            nextMatch={nextMatch}
            selectedTeamId={selectedTeamId}
            teams={teams}
          />
        )}

        {/* ── Team selector or team detail ── */}
        {selectedTeamId == null ? (
          /* ── No team selected: show grid ── */
          <div className="player-view-section">
            <div className="player-view-section-title">Wybierz drużynę</div>
            {teams.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏐</div>
                <div className="empty-state-text">Brak drużyn w turnieju.</div>
              </div>
            ) : (
              <div className="player-view-team-grid">
                {teams.map((team) => (
                  <TeamCard key={team.id} team={team} onClick={() => selectTeam(team.id)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Team selected: show roster + bracket summary ── */
          <>
            {/* Back button + team name */}
            <div className="player-view-team-header">
              <button className="player-view-back-btn" onClick={clearTeam}>
                ← Wszystkie drużyny
              </button>
              <div className="player-view-team-title">
                {selectedTeam && (
                  <span
                    className="player-view-team-dot"
                    style={{ background: selectedTeam.color ?? '#64748b' }}
                  />
                )}
                <span>{selectedTeam?.name ?? 'Drużyna'}</span>
              </div>
            </div>

            {/* Roster */}
            <div className="player-view-section">
              <div className="player-view-section-title">Skład drużyny</div>
              {playersLoading ? (
                <div className="player-view-loading">Ładowanie zawodników...</div>
              ) : players.length === 0 ? (
                <div className="player-view-empty">Brak zawodników w tej drużynie.</div>
              ) : (
                <div className="player-view-roster">
                  {players
                    .slice()
                    .sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999))
                    .map((p) => (
                      <PlayerRow key={p.id} player={p} />
                    ))}
                </div>
              )}
            </div>

            {/* Bracket summary */}
            <div className="player-view-section">
              <div className="player-view-section-title">Wyniki w turnieju</div>
              <BracketSummary
                teamId={selectedTeamId}
                upcomingMatches={upcomingMatches}
                recentMatches={recentMatches}
                teams={teams}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
