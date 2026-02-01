import { useEffect } from 'react'
import { useSocket } from '../../socket/context'
import { useMatchStore, type MatchScore } from '../../stores/match.store'
import { useTournamentStore, type Tournament, type TournamentState } from '../../stores/tournament.store'
import '../../styles/admin.css'

type Ack<T> = { ok: true; data: T } | { ok: false; error: string }

export function StreamOverlay() {
  const { socket, connected } = useSocket()
  const { teams, setTournament, setTeams } = useTournamentStore()
  const { matchId, team1Id, team2Id, score, setMatchId, setMatchTeams, setScore } = useMatchStore()

  useEffect(() => {
    if (!socket) return

    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok) return
      setTournament(ack.data)
    })

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

    socket.on('match:status', onMatchStatus)
    socket.on('match:score', onMatchScore)
    socket.on('tournament:state', onState)

    return () => {
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

  const params = new URLSearchParams(window.location.search)
  const transparent = params.get('transparent') !== 'false'

  const team1 = teams.find((t) => t.id === team1Id)
  const team2 = teams.find((t) => t.id === team2Id)

  const hasActiveMatch = !!matchId && !!team1Id && !!team2Id

  return (
    <div className={`overlay-page ${!transparent ? 'with-bg' : ''}`}>
      {/* Debug indicator (only in non-transparent mode) */}
      {!transparent && (
        <div style={{ position: 'absolute', top: 24, left: 24, opacity: 0.4, fontSize: 12 }}>
          Overlay ({connected ? 'online' : 'offline'})
        </div>
      )}

      {/* Score Bar */}
      {hasActiveMatch && (
        <div className="overlay-scorebar">
          <div className="overlay-team" style={{ color: team1?.color || '#ffffff' }}>
            {team1?.name ?? 'DRUŻYNA 1'}
          </div>
          <div className="overlay-scores">
            <div className="overlay-score">{score?.team1CurrentPoints ?? 0}</div>
            <div className="overlay-separator">:</div>
            <div className="overlay-score">{score?.team2CurrentPoints ?? 0}</div>
          </div>
          <div className="overlay-team" style={{ color: team2?.color || '#ffffff', textAlign: 'right' }}>
            {team2?.name ?? 'DRUŻYNA 2'}
          </div>
        </div>
      )}
    </div>
  )
}
