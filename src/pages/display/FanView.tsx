import { useEffect } from 'react'
import { useSocket } from '../../socket/context'
import { useMatchStore, type MatchScore } from '../../stores/match.store'
import { useTournamentStore, type Tournament, type TournamentState } from '../../stores/tournament.store'

type Ack<T> = { ok: true; data: T } | { ok: false; error: string }

export function FanView() {
  const { socket, connected } = useSocket()
  const { tournament, setTournament } = useTournamentStore()
  const { matchId, score, setMatchId, setScore } = useMatchStore()

  useEffect(() => {
    if (!socket) return

    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok) return
      setTournament(ack.data)
    })

    const onTournamentUpdated = (t: Tournament) => setTournament(t)
    const onMatchStatus = (m: { id?: string }) => {
      if (m?.id) setMatchId(m.id)
    }
    const onMatchScore = (s: MatchScore) => setScore(s)
    const onState = (state: TournamentState) => {
      setTournament(state.tournament)
      if (state.currentMatch?.id) setMatchId(state.currentMatch.id)
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
  }, [socket, setTournament, setMatchId, setScore])

  useEffect(() => {
    if (!socket || !matchId) return
    socket.emit('match:score', { matchId }, (ack: Ack<MatchScore>) => {
      if (!ack.ok) return
      setScore(ack.data)
    })
  }, [socket, matchId, setScore])

  return (
    <div style={{ fontFamily: 'system-ui', padding: 32 }}>
      <h1>{tournament?.name ?? 'Turniej'}</h1>
      <div>Socket: {connected ? 'połączono' : 'rozłączono'}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <div>
          <div style={{ fontSize: 24 }}>DRUŻYNA 1</div>
          <div style={{ fontSize: 120, fontWeight: 700 }}>{score?.team1CurrentPoints ?? 0}</div>
        </div>
        <div>
          <div style={{ fontSize: 24, textAlign: 'right' }}>DRUŻYNA 2</div>
          <div style={{ fontSize: 120, fontWeight: 700, textAlign: 'right' }}>
            {score?.team2CurrentPoints ?? 0}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, opacity: 0.7 }}>Aktualny set: {score?.currentSet ?? 1}</div>
    </div>
  )
}
