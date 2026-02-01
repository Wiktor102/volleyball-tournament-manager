import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../../socket/context'
import { useTournamentStore, type Team, type Tournament, type TournamentState } from '../../stores/tournament.store'

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

export function BracketEditor() {
  const { socket, connected } = useSocket()
  const { tournament, teams, setTournament, setTeams } = useTournamentStore()
  const [bracket, setBracket] = useState<BracketMatch[]>([])
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

    const onBracket = (items: BracketMatch[]) => setBracket(items)

    socket.on('tournament:state', onState)
    socket.on('bracket:updated', onBracket)

    return () => {
      socket.off('tournament:state', onState)
      socket.off('bracket:updated', onBracket)
    }
  }, [socket, setTournament, setTeams])

  const load = () => {
    if (!socket || !tournament) return
    socket.emit('bracket:list', { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
      if (!ack.ok) return
      setBracket(ack.data)
    })
  }

  useEffect(() => {
    if (!tournament) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.id])

  const rounds = useMemo(() => {
    const map = new Map<number, BracketMatch[]>()
    for (const m of bracket) {
      map.set(m.roundNumber, [...(map.get(m.roundNumber) ?? []), m])
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({ round, matches: matches.sort((a, b) => a.positionInRound - b.positionInRound) }))
  }, [bracket])

  const teamLabel = (t: Team | undefined) => {
    if (!t) return '—'
    return t.shortName ? `${t.name} (${t.shortName})` : t.name
  }

  const gen = () => {
    if (!socket || !tournament) return
    setError(null)
    socket.emit('admin:bracket:generate', { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
      if (!ack.ok) {
        setError(ack.error)
        return
      }
      setBracket(ack.data)
    })
  }

  const clear = () => {
    if (!socket || !tournament) return
    setError(null)
    socket.emit('admin:bracket:clear', { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
      if (!ack.ok) {
        setError(ack.error)
        return
      }
      setBracket(ack.data)
    })
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1 style={{ margin: 0 }}>Drabinka</h1>
        <Link to="/admin">← Panel</Link>
      </div>

      <div style={{ marginTop: 8, opacity: 0.8 }}>Socket: {connected ? 'połączono' : 'rozłączono'}</div>

      <section style={{ marginTop: 16 }}>
        <button onClick={gen} disabled={!tournament}>
          Generuj drabinkę
        </button>{' '}
        <button onClick={clear} disabled={!tournament}>
          Wyczyść drabinkę
        </button>{' '}
        <button onClick={load} disabled={!tournament}>
          Odśwież
        </button>
        {error ? <div style={{ marginTop: 8, color: '#b91c1c' }}>{error}</div> : null}
      </section>

      {rounds.length === 0 ? (
        <div style={{ marginTop: 16, opacity: 0.8 }}>Brak drabinki.</div>
      ) : (
        <div style={{ display: 'flex', gap: 24, marginTop: 16, overflowX: 'auto' }}>
          {rounds.map(({ round, matches }) => (
            <div key={round} style={{ minWidth: 320 }}>
              <h2>Runda {round}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {matches.map((m) => {
                  const t1 = teams.find((t) => t.id === m.team1Id)
                  const t2 = teams.find((t) => t.id === m.team2Id)
                  return (
                    <div key={m.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        #{m.matchNumber} • {m.status}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <div style={{ color: t1?.color ?? undefined }}>{teamLabel(t1)}</div>
                        <div style={{ color: t2?.color ?? undefined }}>{teamLabel(t2)}</div>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>ID: {m.id}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
