import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../../socket/context'
import { useTournamentStore, type Team, type Tournament, type TournamentState } from '../../stores/tournament.store'
import '../../styles/admin.css'

type Ack<T> = { ok: true; data: T | null } | { ok: false; error: string }

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
  const { socket, connected, reconnecting, onReconnect } = useSocket()
  const { tournament, teams, setTournament, setTeams } = useTournamentStore()
  const [bracket, setBracket] = useState<BracketMatch[]>([])

  // Function to refresh all state from server
  const refreshState = useCallback(() => {
    if (!socket) return
    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok || !ack.data) return
      setTournament(ack.data)
      // Load bracket
      socket.emit('bracket:list', { tournamentId: ack.data.id }, (bracketAck: Ack<BracketMatch[]>) => {
        if (bracketAck.ok && bracketAck.data) setBracket(bracketAck.data)
      })
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
      if (!ack.ok || !ack.data) return
      setBracket(ack.data)
    })
  }

  useEffect(() => {
    if (!tournament) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.id])

  const { rounds, thirdPlaceMatch } = useMemo(() => {
    const regularMatches = bracket.filter(m => !m.isThirdPlaceMatch)
    const thirdPlace = bracket.find(m => m.isThirdPlaceMatch) ?? null
    
    const map = new Map<number, BracketMatch[]>()
    for (const m of regularMatches) map.set(m.roundNumber, [...(map.get(m.roundNumber) ?? []), m])
    const roundsList = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({ round, matches: matches.sort((a, b) => a.positionInRound - b.positionInRound) }))
    
    return { rounds: roundsList, thirdPlaceMatch: thirdPlace }
  }, [bracket])

  const teamLabel = (t: Team | undefined) => {
    if (!t) return '—'
    return t.name
  }

  const getRoundName = (round: number, totalRounds: number) => {
    if (round === totalRounds) return 'Finał'
    if (round === totalRounds - 1) return 'Półfinały'
    if (round === totalRounds - 2) return 'Ćwierćfinały'
    return `Runda ${round}`
  }

  const totalRounds = Math.max(...rounds.map((r) => r.round), 0)

  return (
    <div className="display-page">
      <div className="display-container">
        <div className="display-header">
          <h1>🏆 {tournament?.name ?? 'Turniej'} – Drabinka</h1>
          <div className="flex items-center gap-2">
            <span className={`status-badge ${connected ? 'connected' : reconnecting ? 'reconnecting' : 'disconnected'}`}>
              {connected ? 'Online' : reconnecting ? 'Łączenie...' : 'Offline'}
            </span>
            <Link to="/display/fan" className="btn btn-secondary btn-sm">
              Wynik na żywo
            </Link>
          </div>
        </div>

        {rounds.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <div className="empty-state-text">
                Drabinka nie została jeszcze wygenerowana.
              </div>
            </div>
          </div>
        ) : (
          <div className="bracket-rounds">
            {rounds.map(({ round, matches }) => (
              <div key={round} className="bracket-round">
                <h3>{getRoundName(round, totalRounds)}</h3>
                <div className="list">
                  {matches.map((m) => {
                    const t1 = teams.find((t) => t.id === m.team1Id)
                    const t2 = teams.find((t) => t.id === m.team2Id)
                    const w = teams.find((t) => t.id === m.winnerId)

                    return (
                      <div key={m.id} className={`match-card ${m.status}`}>
                        <div className="match-card-header">
                          <span className="match-number">Mecz #{m.matchNumber}</span>
                          <span className={`status-badge ${m.status}`}>
                            {m.status === 'pending' ? 'Oczekuje' : m.status === 'live' ? 'Na żywo' : 'Zakończony'}
                          </span>
                        </div>

                        <div className="match-teams">
                          <div
                            className={`match-team ${m.winnerId === m.team1Id ? 'winner' : ''}`}
                            style={{ color: t1?.color || undefined }}
                          >
                            {teamLabel(t1)}
                          </div>
                          <div
                            className={`match-team ${m.winnerId === m.team2Id ? 'winner' : ''}`}
                            style={{ color: t2?.color || undefined }}
                          >
                            {teamLabel(t2)}
                          </div>
                        </div>

                        {w && (
                          <div className="text-dim" style={{ fontSize: 13 }}>
                            ✓ Zwycięzca: {teamLabel(w)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            
            {/* 3rd Place Match */}
            {thirdPlaceMatch && (
              <div className="bracket-round">
                <h3>🥉 Mecz o 3. miejsce</h3>
                <div className="list">
                  {(() => {
                    const m = thirdPlaceMatch
                    const t1 = teams.find((t) => t.id === m.team1Id)
                    const t2 = teams.find((t) => t.id === m.team2Id)
                    const w = teams.find((t) => t.id === m.winnerId)

                    return (
                      <div key={m.id} className={`match-card ${m.status}`}>
                        <div className="match-card-header">
                          <span className="match-number">O 3. miejsce</span>
                          <span className={`status-badge ${m.status}`}>
                            {m.status === 'pending' ? 'Oczekuje' : m.status === 'live' ? 'Na żywo' : 'Zakończony'}
                          </span>
                        </div>

                        <div className="match-teams">
                          <div
                            className={`match-team ${m.winnerId === m.team1Id ? 'winner' : ''}`}
                            style={{ color: t1?.color || undefined }}
                          >
                            {teamLabel(t1)}
                          </div>
                          <div
                            className={`match-team ${m.winnerId === m.team2Id ? 'winner' : ''}`}
                            style={{ color: t2?.color || undefined }}
                          >
                            {teamLabel(t2)}
                          </div>
                        </div>

                        {w && (
                          <div className="text-dim" style={{ fontSize: 13 }}>
                            🥉 3. miejsce: {teamLabel(w)}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
