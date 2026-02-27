import { useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../../socket/context'
import { useMatchStore, type MatchScore } from '../../stores/match.store'
import { useTournamentStore, type Tournament, type TournamentState } from '../../stores/tournament.store'
import '../../styles/admin.css'

type Ack<T> = { ok: true; data: T | null } | { ok: false; error: string }

export function FanView() {
  const { socket, connected, reconnecting, onReconnect } = useSocket()
  const { tournament, teams, setTournament, setTeams } = useTournamentStore()
  const { matchId, team1Id, team2Id, score, setMatchId, setMatchTeams, setScore } = useMatchStore()

  // Function to refresh all state from server
  const refreshState = useCallback(() => {
    if (!socket) return
    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok || !ack.data) return
      setTournament(ack.data)
    })
  }, [socket, setTournament])

  // Subscribe to reconnect events
  useEffect(() => {
    return onReconnect(() => {
      refreshState()
    })
  }, [onReconnect, refreshState])

  useEffect(() => {
    if (!socket) return

    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok || !ack.data) return
      setTournament(ack.data)
    })

    const onTournamentUpdated = (t: Tournament) => setTournament(t)
    const onMatchStatus = (m: { id?: string; team1Id?: string | null; team2Id?: string | null }) => {
      if (m?.id) {
        setMatchId(m.id)
        setMatchTeams(m.team1Id ?? null, m.team2Id ?? null)
      }
    }
    const onMatchScore = (s: MatchScore) => setScore(s)
    const onState = (state: TournamentState) => {
      setTournament(state.tournament)
      setTeams(state.teams)
      if (state.currentMatch?.id) {
        setMatchId(state.currentMatch.id)
        setMatchTeams(state.currentMatch.team1Id ?? null, state.currentMatch.team2Id ?? null)
      }
      if (state.score) setScore(state.score as MatchScore)
    }

    socket.on('tournament:updated', onTournamentUpdated)
    socket.on('match:status', onMatchStatus)
    socket.on('match:score', onMatchScore)
    socket.on('tournament:state', onState)

    return () => {
      socket.off('tournament:updated', onTournamentUpdated)
      socket.off('match:status', onMatchStatus)
      socket.off('match:score', onMatchScore)
      socket.off('tournament:state', onState)
    }
  }, [socket, setTournament, setTeams, setMatchId, setMatchTeams, setScore])

  useEffect(() => {
    if (!socket || !matchId) return
    socket.emit('match:score', { matchId }, (ack: Ack<MatchScore>) => {
      if (!ack.ok) return
      setScore(ack.data)
    })
  }, [socket, matchId, setScore])

  const team1 = teams.find((t) => t.id === team1Id)
  const team2 = teams.find((t) => t.id === team2Id)

  const hasActiveMatch = !!matchId && !!team1Id && !!team2Id

  return (
    <div className="display-page">
      <div className="display-container">
        <div className="display-header">
          <h1>🏐 {tournament?.name ?? 'Turniej'}</h1>
          <div className="flex items-center gap-2">
            <span className={`status-badge ${connected ? 'connected' : reconnecting ? 'reconnecting' : 'disconnected'}`}>
              {connected ? 'Online' : reconnecting ? 'Łączenie...' : 'Offline'}
            </span>
            <Link to="/display/bracket" className="btn btn-secondary btn-sm">
              Drabinka
            </Link>
          </div>
        </div>

        {hasActiveMatch ? (
          <>
            <div className="live-indicator mb-3" style={{ justifyContent: 'center' }}>
              <span className="live-dot"></span>
              <span style={{ fontSize: 18 }}>MECZ NA ŻYWO</span>
            </div>

            {/* Sets Score */}
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
      </div>
    </div>
  )
}
