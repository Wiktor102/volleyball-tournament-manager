import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSocket } from '../../socket/context'
import { useTournamentStore, type Team, type Tournament, type TournamentState } from '../../stores/tournament.store'
import type { MatchScore } from '../../stores/match.store'

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
      if (!ack.ok) setError(ack.error)
      else {
        setMatch(ack.data)
        refreshScore()
      }
    })
  }

  const end = (winnerId: string) => {
    if (!socket || !tournament || !matchId) return
    setError(null)
    socket.emit('admin:match:end', { tournamentId: tournament.id, matchId, winnerId }, (ack: Ack<BracketMatch>) => {
      if (!ack.ok) setError(ack.error)
      else {
        setMatch(ack.data)
        refreshScore()
      }
    })
  }

  const reset = () => {
    if (!socket || !tournament || !matchId) return
    setError(null)
    socket.emit('admin:match:reset', { tournamentId: tournament.id, matchId }, (ack: Ack<BracketMatch>) => {
      if (!ack.ok) setError(ack.error)
      else {
        setMatch(ack.data)
        refreshScore()
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
      <div style={{ fontFamily: 'system-ui', padding: 24 }}>
        <h1>Kontrola meczu</h1>
        <div>Brak ID meczu w URL.</div>
        <div style={{ marginTop: 12 }}>
          <Link to="/admin/bracket">← Drabinka</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1 style={{ margin: 0 }}>Kontrola meczu</h1>
        <Link to="/admin/bracket">← Drabinka</Link>
      </div>
      <div style={{ opacity: 0.7 }}>Socket: {connected ? 'połączono' : 'rozłączono'}</div>

      {!match ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ opacity: 0.8 }}>Nie znaleziono meczu w drabince.</div>
          <button style={{ marginTop: 12 }} onClick={loadMatch} disabled={!tournament}>
            Odśwież
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 12, opacity: 0.75 }}>
            Runda {match.roundNumber} • #{match.matchNumber} • {match.status}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: t1?.color ?? undefined }}>{teamLabel(t1)}</div>
              <div style={{ fontSize: 140, fontWeight: 900, lineHeight: 1 }}>{score?.team1CurrentPoints ?? 0}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button disabled={!canScore} onClick={() => dec('team1')}>
                  -
                </button>
                <button disabled={!canScore} onClick={() => inc('team1')}>
                  +
                </button>
              </div>
              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>Skróty: A (+), Q (-)</div>
            </div>

            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: t2?.color ?? undefined }}>{teamLabel(t2)}</div>
              <div style={{ fontSize: 140, fontWeight: 900, lineHeight: 1 }}>{score?.team2CurrentPoints ?? 0}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button disabled={!canScore} onClick={() => dec('team2')}>
                  -
                </button>
                <button disabled={!canScore} onClick={() => inc('team2')}>
                  +
                </button>
              </div>
              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>Skróty: L (+), P (-)</div>
            </div>
          </div>

          <div style={{ marginTop: 16, opacity: 0.75 }}>Aktualny set: {score?.currentSet ?? 1}</div>

          <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button disabled={!canStart} onClick={start}>
              Start
            </button>

            <button disabled={match.status !== 'live' || !match.team1Id} onClick={() => end(match.team1Id!)}>
              Koniec – wygrała {teamLabel(t1)}
            </button>
            <button disabled={match.status !== 'live' || !match.team2Id} onClick={() => end(match.team2Id!)}>
              Koniec – wygrała {teamLabel(t2)}
            </button>

            <button onClick={reset}>Reset</button>
          </div>

          {match.winnerId ? (
            <div style={{ marginTop: 10, opacity: 0.8 }}>Zwycięzca: {teamLabel(teams.find((t) => t.id === match.winnerId))}</div>
          ) : null}

          {error ? <div style={{ marginTop: 10, color: '#b91c1c' }}>{error}</div> : null}
        </>
      )}
    </div>
  )
}
