import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSocket } from '../../socket/context'
import { useTournamentStore, type Team, type Tournament, type TournamentState } from '../../stores/tournament.store'
import type { MatchScore } from '../../stores/match.store'
import { useToast } from '../../components/Toast'
import '../../styles/admin.css'

type Ack<T> = { ok: true; data: T } | { ok: false; error: string }

type BracketMatch = {
  id: string
  tournamentId: string
  roundNumber: number
  matchNumber: number
  positionInRound: number
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  status: 'pending' | 'live' | 'completed'
  isThirdPlaceMatch: boolean
  nextMatchId: string | null
}

export function MatchControl() {
  const { matchId: matchIdParam } = useParams()
  const matchId = matchIdParam ?? ''

  const { socket, connected } = useSocket()
  const { tournament, teams, setTournament, setTeams } = useTournamentStore()
  const { addToast } = useToast()

  const [match, setMatch] = useState<BracketMatch | null>(null)
  const [score, setScore] = useState<MatchScore | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!socket) return

    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok) return
      setTournament(ack.data)
    })

    const onState = (state: TournamentState) => {
      setTournament(state.tournament)
      setTeams(state.teams)
    }

    const onMatchStatus = (m: Partial<BracketMatch> & { id?: string }) => {
      if (!m?.id || m.id !== matchId) return
      setMatch((prev) => (prev ? ({ ...prev, ...m } as BracketMatch) : (m as BracketMatch)))
    }

    socket.on('tournament:state', onState)
    socket.on('match:status', onMatchStatus)

    return () => {
      socket.off('tournament:state', onState)
      socket.off('match:status', onMatchStatus)
    }
  }, [socket, setTournament, setTeams, matchId])

  const teamLabel = (t: Team | undefined) => {
    if (!t) return '—'
    return t.shortName ? `${t.name} (${t.shortName})` : t.name
  }

  const loadMatch = () => {
    if (!socket || !tournament || !matchId) return
    socket.emit('bracket:list', { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
      if (!ack.ok) return
      const found = ack.data.find((m) => m.id === matchId) ?? null
      setMatch(found)
    })
  }

  const refreshScore = () => {
    if (!socket || !matchId) return
    socket.emit('match:score', { matchId }, (ack: Ack<MatchScore>) => {
      if (!ack.ok) return
      setScore(ack.data)
    })
  }

  useEffect(() => {
    if (!tournament || !matchId) return
    loadMatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.id, matchId])

  useEffect(() => {
    if (!socket || !matchId) return

    socket.emit('match:score', { matchId }, (ack: Ack<MatchScore>) => {
      if (!ack.ok) return
      setScore(ack.data)
    })

    const onScore = (s: MatchScore) => {
      if (s.matchId !== matchId) return
      setScore(s)
    }

    socket.on('match:score', onScore)

    return () => {
      socket.off('match:score', onScore)
    }
  }, [socket, matchId])

  const inc = (team: 'team1' | 'team2') => {
    if (!socket || !matchId) return
    socket.emit('admin:score:increment', { matchId, team })
  }

  const dec = (team: 'team1' | 'team2') => {
    if (!socket || !matchId) return
    socket.emit('admin:score:decrement', { matchId, team })
  }

  const start = () => {
    if (!socket || !tournament || !matchId) return
    setError(null)
    socket.emit('admin:match:start', { tournamentId: tournament.id, matchId }, (ack: Ack<BracketMatch>) => {
      if (!ack.ok) {
        setError(ack.error)
        addToast(ack.error, 'error')
      } else {
        setMatch(ack.data)
        refreshScore()
        addToast('Mecz rozpoczęty', 'success')
      }
    })
  }

  const end = (winnerId: string) => {
    if (!socket || !tournament || !matchId) return
    setError(null)
    socket.emit('admin:match:end', { tournamentId: tournament.id, matchId, winnerId }, (ack: Ack<BracketMatch>) => {
      if (!ack.ok) {
        setError(ack.error)
        addToast(ack.error, 'error')
      } else {
        setMatch(ack.data)
        refreshScore()
        addToast('Mecz zakończony', 'success')
      }
    })
  }

  const reset = () => {
    if (!socket || !tournament || !matchId) return
    setError(null)
    socket.emit('admin:match:reset', { tournamentId: tournament.id, matchId }, (ack: Ack<BracketMatch>) => {
      if (!ack.ok) {
        setError(ack.error)
        addToast(ack.error, 'error')
      } else {
        setMatch(ack.data)
        refreshScore()
        addToast('Mecz zresetowany', 'info')
      }
    })
  }

  const t1 = teams.find((t) => t.id === match?.team1Id)
  const t2 = teams.find((t) => t.id === match?.team2Id)

  const canStart = match?.status === 'pending' && !!match.team1Id && !!match.team2Id
  const canScore = match?.status === 'live'

  useEffect(() => {
    if (!canScore) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'a' || e.key === 'A') inc('team1')
      if (e.key === 'l' || e.key === 'L') inc('team2')
      if (e.key === 'q' || e.key === 'Q') dec('team1')
      if (e.key === 'p' || e.key === 'P') dec('team2')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canScore, socket, matchId])

  if (!matchId) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="card">
            <h2>Kontrola meczu</h2>
            <p className="text-muted">Brak ID meczu w URL.</p>
            <Link to="/admin/bracket" className="btn btn-secondary">
              ← Wróć do drabinki
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div className="flex items-center gap-2">
            <h1>Kontrola meczu</h1>
            <span className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Połączono' : 'Rozłączono'}
            </span>
          </div>
          <nav className="admin-nav">
            <Link to="/admin/bracket">← Drabinka</Link>
            <Link to="/admin">Panel główny</Link>
            <Link to="/display/fan">Widok fanów</Link>
            <Link to="/overlay">Overlay</Link>
          </nav>
        </header>

        {!match ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🏐</div>
              <div className="empty-state-text">Nie znaleziono meczu w drabince.</div>
              <button className="btn btn-secondary" onClick={loadMatch} disabled={!tournament}>
                Odśwież
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Match Info Bar */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div className="flex items-center gap-2">
                <span className="text-muted">Mecz #{match.matchNumber}</span>
                <span className="text-dim">•</span>
                <span className="text-muted">Runda {match.roundNumber}</span>
                <span className="text-dim">•</span>
                <span className={`status-badge ${match.status}`}>
                  {match.status === 'pending' ? 'Oczekuje' : match.status === 'live' ? 'Na żywo' : 'Zakończony'}
                </span>
              </div>
              <div className="text-dim" style={{ fontSize: 12 }}>Set: {score?.currentSet ?? 1}</div>
            </div>

            {/* Score Display */}
            <div className="card">
              <div className="score-display">
                <div className="score-team left">
                  <div className="score-team-name" style={{ color: t1?.color || undefined }}>
                    {teamLabel(t1)}
                  </div>
                  <div className="score-value">{score?.team1CurrentPoints ?? 0}</div>
                  <div className="score-controls">
                    <button className="btn btn-secondary btn-lg" disabled={!canScore} onClick={() => dec('team1')}>
                      −
                    </button>
                    <button className="btn btn-primary btn-lg" disabled={!canScore} onClick={() => inc('team1')}>
                      +
                    </button>
                  </div>
                  <div className="keyboard-hint mt-2">A (+) / Q (-)</div>
                </div>

                <div className="score-vs">vs</div>

                <div className="score-team right">
                  <div className="score-team-name" style={{ color: t2?.color || undefined }}>
                    {teamLabel(t2)}
                  </div>
                  <div className="score-value">{score?.team2CurrentPoints ?? 0}</div>
                  <div className="score-controls">
                    <button className="btn btn-secondary btn-lg" disabled={!canScore} onClick={() => dec('team2')}>
                      −
                    </button>
                    <button className="btn btn-primary btn-lg" disabled={!canScore} onClick={() => inc('team2')}>
                      +
                    </button>
                  </div>
                  <div className="keyboard-hint mt-2">L (+) / P (-)</div>
                </div>
              </div>
            </div>

            {/* Match Controls */}
            <div className="card">
              <div className="card-header">
                <h2>Kontrola meczu</h2>
              </div>
              <div className="btn-group">
                <button className="btn btn-success btn-lg" disabled={!canStart} onClick={start}>
                  ▶ Rozpocznij mecz
                </button>

                <button
                  className="btn btn-primary btn-lg"
                  disabled={match.status !== 'live' || !match.team1Id}
                  onClick={() => end(match.team1Id!)}
                >
                  🏆 Wygrywa {t1?.shortName || t1?.name || 'Drużyna 1'}
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  disabled={match.status !== 'live' || !match.team2Id}
                  onClick={() => end(match.team2Id!)}
                >
                  🏆 Wygrywa {t2?.shortName || t2?.name || 'Drużyna 2'}
                </button>

                <button className="btn btn-danger btn-lg" onClick={reset}>
                  ↺ Resetuj mecz
                </button>
              </div>

              {match.winnerId && (
                <div className="info-message mt-2">
                  <strong>Zwycięzca:</strong> {teamLabel(teams.find((t) => t.id === match.winnerId))}
                </div>
              )}

              {error && <div className="error-message">{error}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
