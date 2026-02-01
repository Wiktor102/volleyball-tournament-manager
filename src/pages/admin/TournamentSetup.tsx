import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSocket } from '../../socket/context'
import { useTournamentStore, type Tournament, type ScoringSettings, type TournamentSettings, type RoundScoringOverride } from '../../stores/tournament.store'
import { useToast } from '../../components/Toast'
import { useConfirm } from '../../components/ConfirmModal'
import '../../styles/admin.css'

type Ack<T> = { ok: true; data: T } | { ok: false; error: string }

const DEFAULT_SCORING: ScoringSettings = {
  mode: 'sets',
  setsToWin: 2,
  pointsToWinSet: 25,
  pointsToWinTieBreak: 15,
  mustWinByTwo: true,
  matchDurationMinutes: 10,
  overtimeMinutes: 2,
  goldenGoal: true,
}

export function TournamentSetup() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { socket, connected, reconnecting } = useSocket()
  const { setTournament } = useTournamentStore()
  const { addToast } = useToast()
  const confirm = useConfirm()

  const isNew = !id || id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Tournament['status']>('draft')
  const [scoring, setScoring] = useState<ScoringSettings>(DEFAULT_SCORING)
  const [roundOverrides, setRoundOverrides] = useState<RoundScoringOverride[]>([])
  const [originalTournament, setOriginalTournament] = useState<Tournament | null>(null)

  // Load existing tournament
  useEffect(() => {
    if (!socket || isNew) return

    socket.emit('tournament:join', { tournamentId: id }, (ack: Ack<Tournament>) => {
      setLoading(false)
      if (!ack.ok) {
        addToast('Nie znaleziono turnieju', 'error')
        navigate('/admin')
        return
      }
      setOriginalTournament(ack.data)
      setName(ack.data.name)
      setStatus(ack.data.status)
      setScoring(ack.data.settings?.scoring ?? DEFAULT_SCORING)
      setRoundOverrides(ack.data.settings?.roundOverrides ?? [])
    })
  }, [socket, id, isNew, navigate, addToast])

  const handleSave = useCallback(() => {
    if (!socket || !name.trim()) return

    setSaving(true)
    const settings: TournamentSettings = { 
      scoring,
      roundOverrides: roundOverrides.length > 0 ? roundOverrides : undefined
    }

    if (isNew) {
      socket.emit('admin:tournament:create', { name: name.trim(), settings }, (ack: Ack<Tournament>) => {
        setSaving(false)
        if (!ack.ok) {
          addToast(ack.error, 'error')
          return
        }
        setTournament(ack.data)
        addToast('Turniej utworzony', 'success')
        navigate('/admin')
      })
    } else {
      socket.emit(
        'admin:tournament:update',
        { tournamentId: id, patch: { name: name.trim(), status, settings } },
        (ack: Ack<Tournament>) => {
          setSaving(false)
          if (!ack.ok) {
            addToast(ack.error, 'error')
            return
          }
          setTournament(ack.data)
          addToast('Turniej zaktualizowany', 'success')
          navigate('/admin')
        }
      )
    }
  }, [socket, name, scoring, roundOverrides, status, isNew, id, setTournament, addToast, navigate])

  const handleDelete = useCallback(async () => {
    if (!socket || !id || isNew) return
    const confirmed = await confirm({
      title: 'Usuń turniej',
      message: 'Czy na pewno chcesz usunąć ten turniej? Ta operacja jest nieodwracalna i usunie wszystkie drużyny, zawodników i mecze.',
      confirmText: 'Usuń turniej',
      danger: true,
      requireTypedConfirmation: 'USUŃ',
    })
    if (!confirmed) return

    socket.emit('admin:tournament:delete', { tournamentId: id }, (ack: { ok: boolean; error?: string }) => {
      if (!ack.ok) {
        addToast(ack.error ?? 'Błąd usuwania', 'error')
        return
      }
      addToast('Turniej usunięty', 'success')
      navigate('/admin')
    })
  }, [socket, id, isNew, confirm, addToast, navigate])

  const updateScoring = (patch: Partial<ScoringSettings>) => {
    setScoring((prev) => ({ ...prev, ...patch }))
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="text-muted">Ładowanie...</div>
        </div>
      </div>
    )
  }

  const hasChanges = isNew || 
    name !== originalTournament?.name ||
    status !== originalTournament?.status ||
    JSON.stringify(scoring) !== JSON.stringify(originalTournament?.settings?.scoring ?? DEFAULT_SCORING) ||
    JSON.stringify(roundOverrides) !== JSON.stringify(originalTournament?.settings?.roundOverrides ?? [])

  return (
    <div className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div className="flex items-center gap-2">
            <Link to="/admin" className="btn btn-secondary btn-sm">← Powrót</Link>
            <h1>{isNew ? 'Nowy turniej' : 'Edytuj turniej'}</h1>
            <span className={`status-badge ${connected ? 'connected' : reconnecting ? 'reconnecting' : 'disconnected'}`}>
              {connected ? 'Połączono' : reconnecting ? 'Łączenie...' : 'Rozłączono'}
            </span>
          </div>
        </header>

        {/* Basic Info */}
        <div className="card">
          <div className="card-header">
            <h2>Informacje podstawowe</h2>
          </div>
          <div className="form-group">
            <label className="form-label">Nazwa turnieju *</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Turniej siatkówki 2026"
            />
          </div>

          {!isNew && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <div className="btn-group">
                <button
                  className={`btn btn-sm ${status === 'draft' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStatus('draft')}
                >
                  Szkic
                </button>
                <button
                  className={`btn btn-sm ${status === 'live' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setStatus('live')}
                >
                  W trakcie
                </button>
                <button
                  className={`btn btn-sm ${status === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStatus('completed')}
                >
                  Zakończony
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scoring Settings */}
        <div className="card">
          <div className="card-header">
            <h2>Ustawienia punktacji (domyślne)</h2>
            <span className="text-muted text-sm">Te ustawienia będą używane dla wszystkich rund, chyba że zostaną nadpisane poniżej.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Tryb punktacji</label>
            <div className="btn-group">
              <button
                className={`btn btn-sm ${scoring.mode === 'sets' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateScoring({ mode: 'sets' })}
              >
                Sety (siatkówka)
              </button>
              <button
                className={`btn btn-sm ${scoring.mode === 'points' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateScoring({ mode: 'points' })}
              >
                Tylko punkty
              </button>
              <button
                className={`btn btn-sm ${scoring.mode === 'timed' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateScoring({ mode: 'timed' })}
              >
                Na czas
              </button>
            </div>
          </div>

          {scoring.mode === 'sets' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sety do wygranej</label>
                  <select
                    className="form-input"
                    value={scoring.setsToWin}
                    onChange={(e) => updateScoring({ setsToWin: Number(e.target.value) })}
                  >
                    <option value={1}>1 (do 1 seta)</option>
                    <option value={2}>2 (do 2 setów - best of 3)</option>
                    <option value={3}>3 (do 3 setów - best of 5)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Punkty do wygranej seta</label>
                  <select
                    className="form-input"
                    value={scoring.pointsToWinSet}
                    onChange={(e) => updateScoring({ pointsToWinSet: Number(e.target.value) })}
                  >
                    <option value={15}>15 punktów</option>
                    <option value={21}>21 punktów</option>
                    <option value={25}>25 punktów</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Punkty w tie-breaku</label>
                  <select
                    className="form-input"
                    value={scoring.pointsToWinTieBreak}
                    onChange={(e) => updateScoring({ pointsToWinTieBreak: Number(e.target.value) })}
                  >
                    <option value={11}>11 punktów</option>
                    <option value={15}>15 punktów</option>
                    <option value={21}>21 punktów</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Przewaga 2 punktów</label>
                  <div className="btn-group">
                    <button
                      className={`btn btn-sm ${scoring.mustWinByTwo ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateScoring({ mustWinByTwo: true })}
                    >
                      Tak
                    </button>
                    <button
                      className={`btn btn-sm ${!scoring.mustWinByTwo ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateScoring({ mustWinByTwo: false })}
                    >
                      Nie
                    </button>
                  </div>
                </div>
              </div>

              <div className="info-message">
                <strong>Podgląd:</strong> Mecz do {scoring.setsToWin} wygranych setów.
                Set wygrywa się przy {scoring.pointsToWinSet} punktach
                {scoring.mustWinByTwo && ' (z przewagą min. 2 pkt)'}.
                {scoring.setsToWin > 1 && ` Decydujący set (tie-break) rozgrywany jest do ${scoring.pointsToWinTieBreak} punktów.`}
              </div>
            </>
          )}

          {scoring.mode === 'points' && (
            <div className="info-message">
              <strong>Tryb prosty:</strong> Licznik punktów bez setów. Admin ręcznie kończy mecz i wybiera zwycięzcę.
            </div>
          )}

          {scoring.mode === 'timed' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Czas meczu (minuty)</label>
                  <select
                    className="form-input"
                    value={scoring.matchDurationMinutes ?? 10}
                    onChange={(e) => updateScoring({ matchDurationMinutes: Number(e.target.value) })}
                  >
                    <option value={5}>5 minut</option>
                    <option value={7}>7 minut</option>
                    <option value={10}>10 minut</option>
                    <option value={15}>15 minut</option>
                    <option value={20}>20 minut</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Dogrywka (minuty)</label>
                  <select
                    className="form-input"
                    value={scoring.overtimeMinutes ?? 2}
                    onChange={(e) => updateScoring({ overtimeMinutes: Number(e.target.value) })}
                  >
                    <option value={0}>Brak dogrywki</option>
                    <option value={1}>1 minuta</option>
                    <option value={2}>2 minuty</option>
                    <option value={3}>3 minuty</option>
                    <option value={5}>5 minut</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Złoty gol (pierwszy punkt w dogrywce wygrywa)</label>
                <div className="btn-group">
                  <button
                    className={`btn btn-sm ${scoring.goldenGoal ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => updateScoring({ goldenGoal: true })}
                  >
                    Tak
                  </button>
                  <button
                    className={`btn btn-sm ${!scoring.goldenGoal ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => updateScoring({ goldenGoal: false })}
                  >
                    Nie
                  </button>
                </div>
              </div>

              <div className="info-message">
                <strong>Tryb na czas:</strong> Mecz trwa {scoring.matchDurationMinutes ?? 10} minut. 
                {(scoring.overtimeMinutes ?? 0) > 0 
                  ? ` Przy remisie - dogrywka ${scoring.overtimeMinutes} min${scoring.goldenGoal ? ' (złoty gol)' : ''}.`
                  : ' Bez dogrywki - przy remisie admin wybiera zwycięzcę.'
                }
              </div>
            </>
          )}
        </div>

        {/* Round Overrides */}
        <div className="card">
          <div className="card-header">
            <h2>Nadpisania dla rund</h2>
            <span className="text-muted text-sm">Ustaw inne zasady punktacji dla wybranych rund (np. finał na czas).</span>
          </div>

          {roundOverrides.map((override, index) => (
            <div key={index} className="round-override-row" style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
              <div className="flex gap-2 items-center" style={{ marginBottom: '0.5rem' }}>
                <select
                  className="form-input"
                  value={override.round}
                  onChange={(e) => {
                    const newOverrides = [...roundOverrides]
                    newOverrides[index].round = e.target.value as RoundScoringOverride['round']
                    setRoundOverrides(newOverrides)
                  }}
                  style={{ width: 'auto' }}
                >
                  <option value="final">Finał</option>
                  <option value="semifinal">Półfinały</option>
                  <option value="thirdPlace">Mecz o 3. miejsce</option>
                  <option value={1}>Runda 1</option>
                  <option value={2}>Runda 2</option>
                  <option value={3}>Runda 3</option>
                </select>
                <span className="text-muted">→</span>
                <select
                  className="form-input"
                  value={override.settings.mode ?? scoring.mode}
                  onChange={(e) => {
                    const newOverrides = [...roundOverrides]
                    newOverrides[index].settings = { ...newOverrides[index].settings, mode: e.target.value as ScoringSettings['mode'] }
                    setRoundOverrides(newOverrides)
                  }}
                  style={{ width: 'auto' }}
                >
                  <option value="sets">Sety</option>
                  <option value="points">Punkty</option>
                  <option value="timed">Na czas</option>
                </select>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setRoundOverrides(roundOverrides.filter((_, i) => i !== index))}
                >
                  Usuń
                </button>
              </div>
              
              {(override.settings.mode ?? scoring.mode) === 'timed' && (
                <div className="flex gap-2" style={{ marginTop: '0.5rem' }}>
                  <label className="flex items-center gap-1 text-sm">
                    Czas:
                    <select
                      className="form-input form-input-sm"
                      value={override.settings.matchDurationMinutes ?? scoring.matchDurationMinutes ?? 10}
                      onChange={(e) => {
                        const newOverrides = [...roundOverrides]
                        newOverrides[index].settings = { ...newOverrides[index].settings, matchDurationMinutes: Number(e.target.value) }
                        setRoundOverrides(newOverrides)
                      }}
                      style={{ width: 'auto' }}
                    >
                      <option value={5}>5 min</option>
                      <option value={7}>7 min</option>
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1 text-sm">
                    Dogrywka:
                    <select
                      className="form-input form-input-sm"
                      value={override.settings.overtimeMinutes ?? scoring.overtimeMinutes ?? 2}
                      onChange={(e) => {
                        const newOverrides = [...roundOverrides]
                        newOverrides[index].settings = { ...newOverrides[index].settings, overtimeMinutes: Number(e.target.value) }
                        setRoundOverrides(newOverrides)
                      }}
                      style={{ width: 'auto' }}
                    >
                      <option value={0}>brak</option>
                      <option value={1}>1 min</option>
                      <option value={2}>2 min</option>
                      <option value={3}>3 min</option>
                    </select>
                  </label>
                </div>
              )}
              
              {(override.settings.mode ?? scoring.mode) === 'sets' && (
                <div className="flex gap-2" style={{ marginTop: '0.5rem' }}>
                  <label className="flex items-center gap-1 text-sm">
                    Sety:
                    <select
                      className="form-input form-input-sm"
                      value={override.settings.setsToWin ?? scoring.setsToWin}
                      onChange={(e) => {
                        const newOverrides = [...roundOverrides]
                        newOverrides[index].settings = { ...newOverrides[index].settings, setsToWin: Number(e.target.value) }
                        setRoundOverrides(newOverrides)
                      }}
                      style={{ width: 'auto' }}
                    >
                      <option value={1}>do 1</option>
                      <option value={2}>do 2</option>
                      <option value={3}>do 3</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          ))}

          <button
            className="btn btn-secondary"
            onClick={() => setRoundOverrides([...roundOverrides, { round: 'final', settings: { mode: 'timed' } }])}
          >
            + Dodaj nadpisanie dla rundy
          </button>
        </div>

        {/* Actions */}
        <div className="card">
          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !name.trim() || !hasChanges}
            >
              {saving ? 'Zapisywanie...' : isNew ? 'Utwórz turniej' : 'Zapisz zmiany'}
            </button>
            <Link to="/admin" className="btn btn-secondary">
              Anuluj
            </Link>
            {!isNew && (
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                style={{ marginLeft: 'auto' }}
              >
                Usuń turniej
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
