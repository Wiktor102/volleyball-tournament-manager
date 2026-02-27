import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSocket } from '../../socket/context'
import { useTournamentStore, type Team, type Tournament, type TournamentState } from '../../stores/tournament.store'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmModal'
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

type MatchAck = { id: string }

export function BracketEditor() {
  const { socket, connected } = useSocket()
  const { tournament, teams, setTournament, setTeams } = useTournamentStore()
  const [bracket, setBracket] = useState<BracketMatch[]>([])
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()

  useEffect(() => {
    if (!socket) return

    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok) return
      if (!ack.data) { navigate('/admin', { replace: true }); return }
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
  }, [socket, setTournament, setTeams, navigate])

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
    for (const m of regularMatches) {
      map.set(m.roundNumber, [...(map.get(m.roundNumber) ?? []), m])
    }
    const roundsList = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({ round, matches: matches.sort((a, b) => a.positionInRound - b.positionInRound) }))
    
    return { rounds: roundsList, thirdPlaceMatch: thirdPlace }
  }, [bracket])

  // Compute which teams are already assigned in round 1 (for duplicate prevention)
  const assignedTeamIds = useMemo(() => {
    const round1 = rounds.find(r => r.round === 1)
    if (!round1) return new Set<string>()
    const ids = new Set<string>()
    for (const m of round1.matches) {
      if (m.team1Id) ids.add(m.team1Id)
      if (m.team2Id) ids.add(m.team2Id)
    }
    return ids
  }, [rounds])

  // Get available teams for a given dropdown slot (exclude already-assigned, but include the current value)
  const getAvailableTeams = (currentTeamId: string | null) => {
    return teams.filter(t => t.id === currentTeamId || !assignedTeamIds.has(t.id))
  }

  // Count how many round-1 slots are still unassigned
  const unassignedSlotCount = useMemo(() => {
    const round1 = rounds.find(r => r.round === 1)
    if (!round1) return 0
    let count = 0
    for (const m of round1.matches) {
      if (!m.team1Id) count++
      if (!m.team2Id) count++
    }
    return count
  }, [rounds])

  const teamLabel = (t: Team | undefined) => {
    if (!t) return '—'
    return t.name
  }

  const gen = async (mode: 'auto' | 'manual') => {
    if (!socket || !tournament) return
    setError(null)

    // Check if bracket already exists - confirm before overwriting
    if (bracket.length > 0) {
      const hasLiveOrCompleted = bracket.some(m => m.status === 'live' || m.status === 'completed')
      const message = hasLiveOrCompleted
        ? 'Istnieje już drabinka z meczami w toku lub zakończonymi. Wygenerowanie nowej drabinki usunie wszystkie dotychczasowe wyniki. Czy na pewno chcesz kontynuować?'
        : 'Istnieje już drabinka. Wygenerowanie nowej zastąpi obecną. Czy na pewno chcesz kontynuować?'
      const confirmed = await confirm({
        title: 'Nadpisz drabinkę',
        message,
        confirmText: 'Generuj nową',
        danger: hasLiveOrCompleted,
      })
      if (!confirmed) return

      // Clear existing bracket first, then generate new one
      await new Promise<void>((resolve, reject) => {
        socket.emit('admin:bracket:clear', { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
          if (!ack.ok) {
            setError(ack.error)
            addToast(ack.error, 'error')
            reject(new Error(ack.error))
          } else {
            resolve()
          }
        })
      })
    }

    socket.emit('admin:bracket:generate', { tournamentId: tournament.id, mode }, (ack: Ack<BracketMatch[]>) => {
      if (!ack.ok) {
        setError(ack.error)
        addToast(ack.error, 'error')
        return
      }
      if (ack.data) setBracket(ack.data)
      addToast(
        mode === 'auto' ? 'Drabinka wygenerowana automatycznie' : 'Drabinka wygenerowana — przypisz drużyny ręcznie',
        'success',
      )
    })
  }

  const clear = async () => {
    if (!socket || !tournament) return
    const confirmed = await confirm({
      title: 'Wyczyść drabinkę',
      message: 'Czy na pewno chcesz wyczyścić całą drabinkę? Ta operacja jest nieodwracalna i usunie wszystkie mecze i wyniki.',
      confirmText: 'Wyczyść',
      danger: true,
      skippable: false,
    })
    if (!confirmed) return
    setError(null)
    socket.emit('admin:bracket:clear', { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
      if (!ack.ok) {
        setError(ack.error)
        addToast(ack.error, 'error')
        return
      }
      if (ack.data) setBracket(ack.data)
      addToast('Drabinka wyczyszczona', 'info')
    })
  }

  const assign = (matchId: string, slot: 'team1' | 'team2', teamId: string | null) => {
    if (!socket || !tournament) return
    setError(null)
    socket.emit(
      'admin:bracket:assign',
      { tournamentId: tournament.id, matchId, slot, teamId },
      (ack: Ack<BracketMatch[]>) => {
        if (!ack.ok) {
          setError(ack.error)
          addToast(ack.error, 'error')
          return
        }
        if (ack.data) setBracket(ack.data)
      },
    )
  }

  const start = (matchId: string) => {
    if (!socket || !tournament) return
    setError(null)
    socket.emit('admin:match:start', { tournamentId: tournament.id, matchId }, (ack: Ack<MatchAck>) => {
      if (!ack.ok) {
        setError(ack.error)
        addToast(ack.error, 'error')
      } else {
        addToast('Mecz rozpoczęty', 'success')
      }
    })
  }

  const end = (matchId: string, winnerId: string) => {
    if (!socket || !tournament) return
    setError(null)
    socket.emit('admin:match:end', { tournamentId: tournament.id, matchId, winnerId }, (ack: Ack<MatchAck>) => {
      if (!ack.ok) {
        setError(ack.error)
        addToast(ack.error, 'error')
      } else {
        addToast('Mecz zakończony', 'success')
      }
    })
  }

  const reset = async (matchId: string, matchInfo: string) => {
    if (!socket || !tournament) return
    const confirmed = await confirm({
      title: 'Resetuj mecz',
      message: `Czy na pewno chcesz zresetować mecz ${matchInfo}? Wynik zostanie wyzerowany, a mecz wróci do stanu oczekującego.`,
      confirmText: 'Resetuj',
      danger: true,
    })
    if (!confirmed) return
    setError(null)
    socket.emit('admin:match:reset', { tournamentId: tournament.id, matchId }, (ack: Ack<MatchAck>) => {
      if (!ack.ok) {
        setError(ack.error)
        addToast(ack.error, 'error')
      } else {
        addToast('Mecz zresetowany', 'info')
      }
    })
  }

  const getRoundName = (round: number, totalRounds: number) => {
    if (round === totalRounds) return 'Finał'
    if (round === totalRounds - 1) return 'Półfinały'
    if (round === totalRounds - 2) return 'Ćwierćfinały'
    return `Runda ${round}`
  }

  const getMatchDescription = (m: BracketMatch) => {
    const t1 = teams.find((t) => t.id === m.team1Id)
    const t2 = teams.find((t) => t.id === m.team2Id)
    const t1Name = t1?.name || 'TBD'
    const t2Name = t2?.name || 'TBD'
    return `${t1Name} vs ${t2Name}`
  }

  const totalRounds = Math.max(...rounds.map((r) => r.round), 0)

  return (
    <div className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div className="flex items-center gap-2">
            <h1>Drabinka turniejowa</h1>
            <span className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Połączono' : 'Rozłączono'}
            </span>
          </div>
          <nav className="admin-nav">
            <Link to="/admin">← Panel główny</Link>
            <Link to="/admin/teams">Drużyny</Link>
            <Link to="/display/bracket">Podgląd publiczny</Link>
          </nav>
        </header>

        {/* Actions */}
        <div className="card">
          <div className="card-header">
            <h2>Akcje</h2>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={() => gen('auto')} disabled={!tournament || teams.length < 2}>
                Generuj automatycznie
              </button>
              <button className="btn btn-secondary" onClick={() => gen('manual')} disabled={!tournament || teams.length < 2}>
                Generuj ręcznie
              </button>
              <button className="btn btn-danger" onClick={clear} disabled={!tournament || bracket.length === 0}>
                Wyczyść drabinkę
              </button>
              <button className="btn btn-secondary" onClick={load} disabled={!tournament}>
                Odśwież
              </button>
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          {teams.length < 2 && (
            <div className="info-message">
              Potrzebujesz co najmniej 2 drużyn, aby wygenerować drabinkę.{' '}
              <Link to="/admin/teams">Dodaj drużyny →</Link>
            </div>
          )}
        </div>

        {/* Manual assignment info */}
        {bracket.length > 0 && unassignedSlotCount > 0 && (
          <div className="card">
            <div className="info-message">
              Przypisz drużyny do {unassignedSlotCount} wolnych miejsc w 1. rundzie. Każda drużyna może wystąpić tylko raz.
              Pozostałe rundy wypełnią się automatycznie na podstawie zwycięzców.
            </div>
          </div>
        )}

        {/* Bracket */}
        {rounds.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <div className="empty-state-text">
                Brak drabinki. Dodaj drużyny i wygeneruj drabinkę, aby rozpocząć turniej.
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
                    return (
                      <div key={m.id} className={`match-card ${m.status}`}>
                        <div className="match-card-header">
                          <span className="match-number">Mecz #{m.matchNumber}</span>
                          <span className={`status-badge ${m.status}`}>
                            {m.status === 'pending' ? 'Oczekuje' : m.status === 'live' ? 'Na żywo' : 'Zakończony'}
                          </span>
                        </div>

                        <div className="match-teams">
                          {round === 1 ? (
                            <select
                              className="form-select"
                              disabled={m.status !== 'pending'}
                              value={m.team1Id ?? ''}
                              onChange={(e) => assign(m.id, 'team1', e.target.value ? e.target.value : null)}
                            >
                              <option value="">— Wybierz drużynę —</option>
                              {getAvailableTeams(m.team1Id).map((t) => (
                                <option key={t.id} value={t.id}>
                                  {teamLabel(t)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={`match-team ${m.winnerId === m.team1Id ? 'winner' : ''}`} style={{ color: t1?.color || undefined }}>
                              {teamLabel(t1)}
                            </div>
                          )}

                          {round === 1 ? (
                            <select
                              className="form-select"
                              disabled={m.status !== 'pending'}
                              value={m.team2Id ?? ''}
                              onChange={(e) => assign(m.id, 'team2', e.target.value ? e.target.value : null)}
                            >
                              <option value="">— Wybierz drużynę —</option>
                              {getAvailableTeams(m.team2Id).map((t) => (
                                <option key={t.id} value={t.id}>
                                  {teamLabel(t)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={`match-team ${m.winnerId === m.team2Id ? 'winner' : ''}`} style={{ color: t2?.color || undefined }}>
                              {teamLabel(t2)}
                            </div>
                          )}
                        </div>

                        {m.winnerId && (
                          <div className="text-dim" style={{ fontSize: 13, marginBottom: 12 }}>
                            ✓ Zwycięzca: {teamLabel(teams.find((t) => t.id === m.winnerId))}
                          </div>
                        )}

                        <div className="btn-group">
                          <Link to={`/admin/match/${m.id}`} className="btn btn-secondary btn-sm">
                            Kontrola meczu
                          </Link>
                          {m.status === 'pending' && m.team1Id && m.team2Id && (
                            <button className="btn btn-success btn-sm" onClick={() => start(m.id)}>
                              Rozpocznij
                            </button>
                          )}
                          {m.status === 'live' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={!m.team1Id}
                                onClick={() => end(m.id, m.team1Id!)}
                              >
                                Wygrywa {t1?.name || 'D1'}
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={!m.team2Id}
                                onClick={() => end(m.id, m.team2Id!)}
                              >
                                Wygrywa {t2?.name || 'D2'}
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => reset(m.id, getMatchDescription(m))}>
                                Reset
                              </button>
                            </>
                          )}
                          {m.status === 'completed' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => reset(m.id, getMatchDescription(m))}>
                              Resetuj mecz
                            </button>
                          )}
                        </div>
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
                    return (
                      <div key={m.id} className={`match-card ${m.status}`}>
                        <div className="match-card-header">
                          <span className="match-number">O 3. miejsce</span>
                          <span className={`status-badge ${m.status}`}>
                            {m.status === 'pending' ? 'Oczekuje' : m.status === 'live' ? 'Na żywo' : 'Zakończony'}
                          </span>
                        </div>

                        <div className="match-teams">
                          <div className={`match-team ${m.winnerId === m.team1Id ? 'winner' : ''}`} style={{ color: t1?.color || undefined }}>
                            {teamLabel(t1)}
                          </div>
                          <div className={`match-team ${m.winnerId === m.team2Id ? 'winner' : ''}`} style={{ color: t2?.color || undefined }}>
                            {teamLabel(t2)}
                          </div>
                        </div>

                        {m.winnerId && (
                          <div className="text-dim" style={{ fontSize: 13, marginBottom: 12 }}>
                            🥉 3. miejsce: {teamLabel(teams.find((t) => t.id === m.winnerId))}
                          </div>
                        )}

                        <div className="btn-group">
                          <Link to={`/admin/match/${m.id}`} className="btn btn-secondary btn-sm">
                            Kontrola meczu
                          </Link>
                          {m.status === 'pending' && m.team1Id && m.team2Id && (
                            <button className="btn btn-success btn-sm" onClick={() => start(m.id)}>
                              Rozpocznij
                            </button>
                          )}
                          {m.status === 'live' && (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={!m.team1Id}
                                onClick={() => end(m.id, m.team1Id!)}
                              >
                                Wygrywa {t1?.name || 'D1'}
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={!m.team2Id}
                                onClick={() => end(m.id, m.team2Id!)}
                              >
                                Wygrywa {t2?.name || 'D2'}
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => reset(m.id, getMatchDescription(m))}>
                                Reset
                              </button>
                            </>
                          )}
                          {m.status === 'completed' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => reset(m.id, getMatchDescription(m))}>
                              Resetuj mecz
                            </button>
                          )}
                        </div>
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
