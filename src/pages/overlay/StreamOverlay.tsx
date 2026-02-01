import { useEffect } from 'react'
import { useSocket } from '../../socket/context'
import { useMatchStore, type MatchScore } from '../../stores/match.store'
import type { Tournament, TournamentState } from '../../stores/tournament.store'

type Ack<T> = { ok: true; data: T } | { ok: false; error: string }

export function StreamOverlay() {
  const { socket, connected } = useSocket()
  const { matchId, score, setMatchId, setScore } = useMatchStore()

  useEffect(() => {
    if (!socket) return

    socket.emit('tournament:default', null, (ack: Ack<Tournament>) => {
      if (!ack.ok) return
      // tournament info is not shown on overlay yet
    })

    const onMatchStatus = (m: { id?: string }) => {
      if (m?.id) setMatchId(m.id)
    }
    const onMatchScore = (s: MatchScore) => setScore(s)
    const onState = (state: TournamentState) => {
      if (state.currentMatch?.id) setMatchId(state.currentMatch.id)
      if (state.score) setScore(state.score as MatchScore)
    }

    socket.on('match:status', onMatchStatus)
    socket.on('match:score', onMatchScore)
    socket.on('tournament:state', onState)

    return () => {
      socket.off('match:status', onMatchStatus)
      socket.off('match:score', onMatchScore)
      socket.off('tournament:state', onState)
    }
  }, [socket, setMatchId, setScore])

  useEffect(() => {
    if (!socket || !matchId) return
    socket.emit('match:score', { matchId }, (ack: Ack<MatchScore>) => {
      if (!ack.ok) return
      setScore(ack.data)
    })
  }, [socket, matchId, setScore])

  const params = new URLSearchParams(window.location.search)
  const transparent = params.get('transparent') === 'true'

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: transparent ? 'transparent' : '#111827',
        color: 'white',
        fontFamily: 'system-ui',
        padding: 24,
      }}
    >
      <div style={{ opacity: 0.6 }}>Overlay ({connected ? 'online' : 'offline'})</div>

      <div
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 24,
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 16,
          padding: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700 }}>DRUŻYNA 1</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <div style={{ fontSize: 56, fontWeight: 800 }}>{score?.team1CurrentPoints ?? 0}</div>
          <div style={{ opacity: 0.5 }}>:</div>
          <div style={{ fontSize: 56, fontWeight: 800 }}>{score?.team2CurrentPoints ?? 0}</div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'right' }}>DRUŻYNA 2</div>
      </div>
    </div>
  )
}
