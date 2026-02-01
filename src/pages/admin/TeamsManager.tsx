import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../../socket/context'
import { useTournamentStore, type Team, type Tournament, type TournamentState } from '../../stores/tournament.store'

type Ack<T> = { ok: true; data: T } | { ok: false; error: string }

type TeamDraft = { name: string; shortName: string; color: string }

type Drafts = Record<string, TeamDraft>

export function TeamsManager() {
  const { socket, connected } = useSocket()
  const { tournament, teams, setTournament, setTeams } = useTournamentStore()

  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [color, setColor] = useState('#FF6B35')

  const [drafts, setDrafts] = useState<Drafts>({})

  useEffect(() => {
    if (!socket) return

    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok) return
      setTournament(ack.data)
    })

    const onState = (state: TournamentState) => {
      setTournament(state.tournament)
      setTeams(state.teams)
      setDrafts((prev) => {
        const next = { ...prev }
        for (const t of state.teams) {
          if (!next[t.id]) next[t.id] = { name: t.name, shortName: t.shortName ?? '', color: t.color ?? '' }
        }
        return next
      })
    }

    socket.on('tournament:state', onState)

    return () => {
      socket.off('tournament:state', onState)
    }
  }, [socket, setTournament, setTeams])

  const canCreate = useMemo(() => !!socket && !!tournament && name.trim().length > 0, [socket, tournament, name])

  const create = () => {
    if (!socket || !tournament) return
    socket.emit(
      'admin:team:create',
      { tournamentId: tournament.id, name: name.trim(), shortName: shortName.trim() || undefined, color: color.trim() || undefined },
      (ack: Ack<Team>) => {
        if (!ack.ok) return
        setName('')
        setShortName('')
      },
    )
  }

  const save = (teamId: string) => {
    if (!socket) return
    const d = drafts[teamId]
    if (!d) return
    socket.emit('admin:team:update', { teamId, patch: { name: d.name.trim(), shortName: d.shortName.trim() || null, color: d.color.trim() || null } })
  }

  const remove = (teamId: string) => {
    if (!socket) return
    socket.emit('admin:team:delete', { teamId })
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <h1 style={{ margin: 0 }}>Drużyny</h1>
        <Link to="/admin">← Panel</Link>
      </div>
      <div style={{ marginTop: 8, opacity: 0.8 }}>Socket: {connected ? 'połączono' : 'rozłączono'}</div>

      <section style={{ marginTop: 16 }}>
        <h2>Dodaj drużynę</h2>
        {!tournament ? (
          <div>Ładowanie…</div>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="Nazwa" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Skrót" value={shortName} onChange={(e) => setShortName(e.target.value)} style={{ width: 90 }} />
            <input value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 120 }} />
            <button onClick={create} disabled={!canCreate}>
              Dodaj
            </button>
          </div>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Lista</h2>
        {teams.length === 0 ? (
          <div>Brak drużyn.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teams.map((t) => {
              const d = drafts[t.id] ?? { name: t.name, shortName: t.shortName ?? '', color: t.color ?? '' }
              return (
                <div key={t.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      value={d.name}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [t.id]: { ...d, name: e.target.value } }))}
                      style={{ minWidth: 240 }}
                    />
                    <input
                      value={d.shortName}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [t.id]: { ...d, shortName: e.target.value } }))}
                      style={{ width: 90 }}
                    />
                    <input
                      value={d.color}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [t.id]: { ...d, color: e.target.value } }))}
                      style={{ width: 120 }}
                    />
                    <button onClick={() => save(t.id)}>Zapisz</button>
                    <button onClick={() => remove(t.id)} style={{ color: '#b91c1c' }}>
                      Usuń
                    </button>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>ID: {t.id}</div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
