import { useEffect, useState } from 'react'
import { useSocket } from '../../socket/context'
import { useMatchStore, type MatchScore } from '../../stores/match.store'
import { useTournamentStore, type Tournament, type TournamentState } from '../../stores/tournament.store'

type Ack<T> = { ok: true; data: T } | { ok: false; error: string }

type DemoPayload = {
  match: { id: string }
  score: MatchScore | null
}

export function Dashboard() {
  const { socket, connected } = useSocket()
  const { tournament, setTournament } = useTournamentStore()
  const { matchId, score, setMatchId, setScore } = useMatchStore()
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!socket) return
    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok) return
      setTournament(ack.data)
    })

    const onTournamentUpdated = (t: Tournament) => setTournament(t)
    const onMatchScore = (s: MatchScore) => setScore(s)
    const onState = (state: TournamentState) => {
      setTournament(state.tournament)
      if (state.currentMatch?.id) setMatchId(state.currentMatch.id)
      if (state.score) setScore(state.score as MatchScore)
    }

    socket.on('tournament:updated', onTournamentUpdated)
    socket.on('match:score', onMatchScore)
    socket.on('tournament:state', onState)

    return () => {
      socket.off('tournament:updated', onTournamentUpdated)
      socket.off('match:score', onMatchScore)
      socket.off('tournament:state', onState)
    }
  }, [socket, setTournament, setScore, setMatchId])

  const ensureDemoMatch = async () => {
    if (!socket || !tournament) return
    setCreating(true)
    socket.emit('admin:match:demo', { tournamentId: tournament.id }, (ack: Ack<DemoPayload>) => {
      setCreating(false)
      if (!ack.ok) return
      setMatchId(ack.data.match.id)
      setScore(ack.data.score)
      socket.emit('match:score', { matchId: ack.data.match.id })
    })
  }

  const inc = (team: 'team1' | 'team2') => {
    if (!socket || !matchId) return
    socket.emit('admin:score:increment', { matchId, team })
  }
  const dec = (team: 'team1' | 'team2') => {
    if (!socket || !matchId) return
    socket.emit('admin:score:decrement', { matchId, team })
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Panel administratora</h1>
      <div>Socket: {connected ? 'połączono' : 'rozłączono'}</div>

      <section style={{ marginTop: 16 }}>
        <h2>Turniej</h2>
        {tournament ? (
          <div>
            <div>
              <b>{tournament.name}</b> ({tournament.status})
            </div>
            <button onClick={ensureDemoMatch} disabled={creating}>
              {creating ? 'Tworzenie…' : 'Utwórz mecz demo'}
            </button>
          </div>
        ) : (
          <div>Ładowanie…</div>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Mecz</h2>
        {!matchId ? (
          <div>Brak aktywnego meczu (utwórz demo).</div>
        ) : (
          <div>
            <div>Match ID: {matchId}</div>
            <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
              <div>
                <h3>Drużyna 1</h3>
                <div style={{ fontSize: 48 }}>{score?.team1CurrentPoints ?? 0}</div>
                <button onClick={() => dec('team1')}>-</button>{' '}
                <button onClick={() => inc('team1')}>+</button>
              </div>
              <div>
                <h3>Drużyna 2</h3>
                <div style={{ fontSize: 48 }}>{score?.team2CurrentPoints ?? 0}</div>
                <button onClick={() => dec('team2')}>-</button>{' '}
                <button onClick={() => inc('team2')}>+</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
