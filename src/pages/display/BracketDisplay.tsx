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

export function BracketDisplay() {
  const { socket, connected } = useSocket()
  const { tournament, teams, setTournament, setTeams } = useTournamentStore()
  const [bracket, setBracket] = useState<BracketMatch[]>([])

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
    for (const m of bracket) map.set(m.roundNumber, [...(map.get(m.roundNumber) ?? []), m])
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({ round, matches: matches.sort((a, b) => a.positionInRound - b.positionInRound) }))
  }, [bracket])

  const teamLabel = (t: Team | undefined) => {
    if (!t) return '—'
    return t.shortName ? `${t.name} (${t.shortName})` : t.name
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1 style={{ margin: 0 }}>{tournament?.name ?? 'Turniej'} – Drabinka</h1>
        <Link to="/display/fan">Widok fanów →</Link>
      </div>
      <div style={{ opacity: 0.7 }}>Socket: {connected ? 'połączono' : 'rozłączono'}</div>

      {rounds.length === 0 ? (
        <div style={{ marginTop: 16, opacity: 0.8 }}>Brak drabinki.</div>
      ) : (
        <div style={{ display: 'flex', gap: 24, marginTop: 16, overflowX: 'auto' }}>
          {rounds.map(({ round, matches }) => (
            <div key={round} style={{ minWidth: 360 }}>
              <h2>Runda {round}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {matches.map((m) => {
                  const t1 = teams.find((t) => t.id === m.team1Id)
                  const t2 = teams.find((t) => t.id === m.team2Id)
                  const w = teams.find((t) => t.id === m.winnerId)

                  const borderColor = m.status === 'live' ? '#f59e0b' : '#e5e7eb'

                  return (
                    <div key={m.id} style={{ border: `2px solid ${borderColor}`, borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        #{m.matchNumber} • {m.status}
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ color: t1?.color ?? undefined, fontWeight: m.winnerId === m.team1Id ? 800 : 600 }}>
                          {teamLabel(t1)}
                        </div>
                        <div style={{ color: t2?.color ?? undefined, fontWeight: m.winnerId === m.team2Id ? 800 : 600 }}>
                          {teamLabel(t2)}
                        </div>
                      </div>

                      {w ? (
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>Zwycięzca: {teamLabel(w)}</div>
                      ) : null}
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
