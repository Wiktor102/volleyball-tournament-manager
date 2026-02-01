import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const { tournament, teams, setTournament, setTeams } = useTournamentStore()
  const { matchId, team1Id, team2Id, score, setMatchId, setMatchTeams, setScore } = useMatchStore()
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
      setTeams(state.teams)
      if (state.currentMatch?.id) {
        setMatchId(state.currentMatch.id)
        setMatchTeams(state.currentMatch.team1Id ?? null, state.currentMatch.team2Id ?? null)
      }
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
  }, [socket, setTournament, setTeams, setScore, setMatchId, setMatchTeams])

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

  const team1Name = teams.find((t) => t.id === team1Id)?.name ?? 'Drużyna 1'
  const team2Name = teams.find((t) => t.id === team2Id)?.name ?? 'Drużyna 2'

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1 style={{ margin: 0 }}>Panel administratora</h1>
        <Link to="/admin/teams">Drużyny →</Link>
        <Link to="/admin/bracket">Drabinka →</Link>
      </div>
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
                <h3>{team1Name}</h3>
                <div style={{ fontSize: 48 }}>{score?.team1CurrentPoints ?? 0}</div>
                <button onClick={() => dec('team1')}>-</button>{' '}
                <button onClick={() => inc('team1')}>+</button>
              </div>
              <div>
                <h3>{team2Name}</h3>
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
