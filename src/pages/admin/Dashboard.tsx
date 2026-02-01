import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../../socket/context'
import { useMatchStore, type MatchScore } from '../../stores/match.store'
import { useTournamentStore, type Tournament, type TournamentState } from '../../stores/tournament.store'
import '../../styles/admin.css'

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

export function Dashboard() {
  const { socket, connected } = useSocket()
  const { tournament, teams, setTournament, setTeams } = useTournamentStore()
  const { setMatchId, setMatchTeams, setScore } = useMatchStore()
  const [tournamentName, setTournamentName] = useState('')
  const [bracket, setBracket] = useState<BracketMatch[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!socket) return
    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok) return
      setTournament(ack.data)
      setTournamentName(ack.data.name)
    })

    const onTournamentUpdated = (t: Tournament) => {
      setTournament(t)
      setTournamentName(t.name)
    }
    const onMatchScore = (s: MatchScore) => setScore(s)
    const onState = (state: TournamentState) => {
      setTournament(state.tournament)
      setTournamentName(state.tournament.name)
      setTeams(state.teams)
      if (state.currentMatch?.id) {
        setMatchId(state.currentMatch.id)
        setMatchTeams(state.currentMatch.team1Id ?? null, state.currentMatch.team2Id ?? null)
      }
      if (state.score) setScore(state.score as MatchScore)
    }
    const onBracket = (items: BracketMatch[]) => setBracket(items)

    socket.on('tournament:updated', onTournamentUpdated)
    socket.on('match:score', onMatchScore)
    socket.on('tournament:state', onState)
    socket.on('bracket:updated', onBracket)

    return () => {
      socket.off('tournament:updated', onTournamentUpdated)
      socket.off('match:score', onMatchScore)
      socket.off('tournament:state', onState)
      socket.off('bracket:updated', onBracket)
    }
  }, [socket, setTournament, setTeams, setScore, setMatchId, setMatchTeams])

  useEffect(() => {
    if (!socket || !tournament) return
    socket.emit('bracket:list', { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
      if (ack.ok) setBracket(ack.data)
    })
  }, [socket, tournament?.id])

  const saveTournamentName = () => {
    if (!socket || !tournament || !tournamentName.trim()) return
    setSaving(true)
    socket.emit(
      'admin:tournament:update',
      { tournamentId: tournament.id, patch: { name: tournamentName.trim() } },
      () => setSaving(false)
    )
  }

  const liveMatch = bracket.find((m) => m.status === 'live')
  const hasTeams = teams.length >= 2
  const hasBracket = bracket.length > 0
  const pendingMatches = bracket.filter((m) => m.status === 'pending' && m.team1Id && m.team2Id)

  const getWorkflowStep = () => {
    if (!hasTeams) return 1
    if (!hasBracket) return 2
    if (liveMatch) return 4
    if (pendingMatches.length > 0) return 3
    return 3
  }
  const currentStep = getWorkflowStep()

  const team1 = liveMatch ? teams.find((t) => t.id === liveMatch.team1Id) : null
  const team2 = liveMatch ? teams.find((t) => t.id === liveMatch.team2Id) : null

  return (
    <div className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div className="flex items-center gap-2">
            <h1>🏐 Panel administratora</h1>
            <span className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Połączono' : 'Rozłączono'}
            </span>
          </div>
          <nav className="admin-nav">
            <Link to="/admin/teams">Drużyny</Link>
            <Link to="/admin/bracket">Drabinka</Link>
            <Link to="/display/fan">Widok fanów</Link>
            <Link to="/display/bracket">Podgląd drabinki</Link>
            <Link to="/overlay">Overlay</Link>
          </nav>
        </header>

        {/* Workflow Steps */}
        <div className="workflow">
          <div className={`workflow-step ${currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : ''}`}>
            <span className="workflow-step-number">{currentStep > 1 ? '✓' : '1'}</span>
            <span>Dodaj drużyny</span>
          </div>
          <span className="workflow-arrow">→</span>
          <div className={`workflow-step ${currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : ''}`}>
            <span className="workflow-step-number">{currentStep > 2 ? '✓' : '2'}</span>
            <span>Wygeneruj drabinkę</span>
          </div>
          <span className="workflow-arrow">→</span>
          <div className={`workflow-step ${currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : ''}`}>
            <span className="workflow-step-number">{currentStep > 3 ? '✓' : '3'}</span>
            <span>Rozgrywaj mecze</span>
          </div>
        </div>

        {/* Tournament Settings */}
        <div className="card">
          <div className="card-header">
            <h2>Turniej</h2>
            {tournament && (
              <span className={`status-badge ${tournament.status}`}>
                {tournament.status === 'draft' ? 'Szkic' : tournament.status === 'live' ? 'W trakcie' : 'Zakończony'}
              </span>
            )}
          </div>
          {tournament ? (
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Nazwa turnieju</label>
                <input
                  className="form-input"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="Nazwa turnieju"
                />
              </div>
              <div className="form-group" style={{ flex: 0 }}>
                <label className="form-label">&nbsp;</label>
                <button
                  className="btn btn-primary"
                  onClick={saveTournamentName}
                  disabled={saving || tournamentName === tournament.name}
                >
                  {saving ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-muted">Ładowanie...</div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-3">
          <div className="card">
            <div className="card-header">
              <h3>Drużyny</h3>
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, marginBottom: 12 }}>{teams.length}</div>
            <Link to="/admin/teams" className="btn btn-secondary btn-sm">
              {teams.length === 0 ? 'Dodaj drużyny' : 'Zarządzaj drużynami'}
            </Link>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Drabinka</h3>
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, marginBottom: 12 }}>
              {bracket.length > 0 ? `${bracket.filter((m) => m.status === 'completed').length}/${bracket.length}` : '—'}
            </div>
            <Link to="/admin/bracket" className="btn btn-secondary btn-sm">
              {bracket.length === 0 ? 'Wygeneruj drabinkę' : 'Edytuj drabinkę'}
            </Link>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Aktualny mecz</h3>
            </div>
            {liveMatch ? (
              <>
                <div className="live-indicator mb-2">
                  <span className="live-dot"></span>
                  <span>NA ŻYWO</span>
                </div>
                <div style={{ fontSize: 14, marginBottom: 12 }}>
                  <span style={{ color: team1?.color || undefined }}>{team1?.name || '—'}</span>
                  <span className="text-dim"> vs </span>
                  <span style={{ color: team2?.color || undefined }}>{team2?.name || '—'}</span>
                </div>
                <Link to={`/admin/match/${liveMatch.id}`} className="btn btn-primary btn-sm">
                  Kontroluj mecz
                </Link>
              </>
            ) : (
              <>
                <div className="text-muted mb-2">Brak aktywnego meczu</div>
                {pendingMatches.length > 0 && (
                  <Link to="/admin/bracket" className="btn btn-secondary btn-sm">
                    Rozpocznij mecz
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Next Steps Guidance */}
        {currentStep === 1 && (
          <div className="info-message">
            <strong>Następny krok:</strong> Dodaj co najmniej 2 drużyny, aby móc wygenerować drabinkę turniejową.
            <Link to="/admin/teams" style={{ marginLeft: 12 }}>
              Przejdź do drużyn →
            </Link>
          </div>
        )}

        {currentStep === 2 && (
          <div className="info-message">
            <strong>Następny krok:</strong> Masz {teams.length} drużyn. Wygeneruj drabinkę turniejową, aby rozpocząć mecze.
            <Link to="/admin/bracket" style={{ marginLeft: 12 }}>
              Przejdź do drabinki →
            </Link>
          </div>
        )}

        {currentStep === 3 && pendingMatches.length > 0 && !liveMatch && (
          <div className="info-message">
            <strong>Gotowe do gry:</strong> Masz {pendingMatches.length} oczekujących meczów. Rozpocznij pierwszy mecz z drabinki.
            <Link to="/admin/bracket" style={{ marginLeft: 12 }}>
              Przejdź do drabinki →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
