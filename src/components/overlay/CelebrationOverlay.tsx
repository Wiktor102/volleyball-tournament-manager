import { useEffect, useRef, useState } from 'react'
import { useSocket } from '../../socket/context'

interface CelebrationOverlayProps {
  matchId: string
  teams: { id: string; name: string; color?: string | null }[]
}

type CelebrationState = {
  teamName: string
  teamColor: string
  type: 'set' | 'match'
} | null

function isCelebrationsEnabled(): boolean {
  try {
    const val = localStorage.getItem('celebrationsEnabled')
    return val === null ? true : val !== 'false'
  } catch {
    return true
  }
}

export function CelebrationOverlay({ matchId, teams }: CelebrationOverlayProps) {
  const { socket } = useSocket()
  const [celebration, setCelebration] = useState<CelebrationState>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSetsRef = useRef<{ team1Sets: number; team2Sets: number } | null>(null)

  const triggerCelebration = (
    teamName: string,
    teamColor: string,
    type: 'set' | 'match',
    durationMs: number,
  ) => {
    if (!isCelebrationsEnabled()) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setCelebration({ teamName, teamColor, type })
    timerRef.current = setTimeout(() => {
      setCelebration(null)
    }, durationMs)
  }

  useEffect(() => {
    if (!socket) return

    const onScore = (s: {
      matchId?: string
      team1Sets?: number
      team2Sets?: number
      team1Id?: string
      team2Id?: string
    }) => {
      if (s.matchId && s.matchId !== matchId) return

      const t1Sets = s.team1Sets ?? 0
      const t2Sets = s.team2Sets ?? 0
      const prev = prevSetsRef.current

      if (prev) {
        if (t1Sets > prev.team1Sets) {
          const team = teams.find(t => t.id === s.team1Id)
          triggerCelebration(team?.name ?? 'Drużyna 1', team?.color ?? '#ffffff', 'set', 2000)
        } else if (t2Sets > prev.team2Sets) {
          const team = teams.find(t => t.id === s.team2Id)
          triggerCelebration(team?.name ?? 'Drużyna 2', team?.color ?? '#ffffff', 'set', 2000)
        }
      }

      prevSetsRef.current = { team1Sets: t1Sets, team2Sets: t2Sets }
    }

    const onMatchStatus = (m: {
      id?: string
      status?: string
      winnerId?: string | null
    }) => {
      if (m.id && m.id !== matchId) return
      if (m.status === 'completed' && m.winnerId) {
        const team = teams.find(t => t.id === m.winnerId)
        triggerCelebration(team?.name ?? 'Zwycięzca', team?.color ?? '#ffffff', 'match', 4000)
      }
    }

    socket.on('match:score', onScore)
    socket.on('match:status', onMatchStatus)

    return () => {
      socket.off('match:score', onScore)
      socket.off('match:status', onMatchStatus)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, matchId, teams])

  if (!celebration) return null

  return (
    <div className={`celebration-overlay celebration-overlay--${celebration.type}`}>
      <div className="celebration-content">
        <div
          className="celebration-team"
          style={{ color: celebration.teamColor }}
        >
          {celebration.teamName}
        </div>
        <div className="celebration-text">
          {celebration.type === 'match' ? 'Mistrz!' : 'Set wygrany!'}
        </div>
      </div>
    </div>
  )
}
