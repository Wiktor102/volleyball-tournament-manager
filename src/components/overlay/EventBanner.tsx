import { useEffect, useRef, useState } from 'react'
import { useSocket } from '../../socket/context'

type MatchEvent = {
  id: string
  matchId: string
  tournamentId: string
  eventType: 'ace' | 'ball-out' | 'challenge' | 'net-touch' | 'block' | 'timeout'
  team: 'team1' | 'team2'
  playerId: string | null
  setNumber: number
  scoreSnapshot: {
    team1Points: number
    team2Points: number
    team1Sets: number
    team2Sets: number
  } | null
  metadata: Record<string, unknown> | null
  createdAt: number
}

interface EventBannerProps {
  matchId: string
  team1: { name: string; color?: string | null } | undefined
  team2: { name: string; color?: string | null } | undefined
}

const EVENT_CONFIG: Record<
  MatchEvent['eventType'],
  { label: string; icon: string; color: string }
> = {
  ace: { label: 'As!', icon: '🏐', color: '#eab308' },
  'ball-out': { label: 'Aut!', icon: '↗', color: '#ef4444' },
  challenge: { label: 'Challenge', icon: '❓', color: '#8b5cf6' },
  'net-touch': { label: 'Siatka', icon: '≈', color: '#06b6d4' },
  block: { label: 'Blok!', icon: '✋', color: '#22c55e' },
  timeout: { label: 'Czas!', icon: '⏱', color: '#94a3b8' },
}

const DEFAULT_BANNER_DURATION_MS = 3000

function getBannerDurationMs(): number {
  try {
    const sec = parseInt(localStorage.getItem('bannerDurationSec') ?? '', 10)
    if (!isNaN(sec) && sec >= 1 && sec <= 10) return sec * 1000
  } catch {
    // ignore
  }
  return DEFAULT_BANNER_DURATION_MS
}

function isBannersEnabled(): boolean {
  try {
    const val = localStorage.getItem('eventBannersEnabled')
    return val === null ? true : val !== 'false'
  } catch {
    return true
  }
}

export function EventBanner({ matchId, team1, team2 }: EventBannerProps) {
  const { socket } = useSocket()
  const [current, setCurrent] = useState<MatchEvent | null>(null)
  const [animState, setAnimState] = useState<'in' | 'out'>('in')
  const queueRef = useRef<MatchEvent[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentIdRef = useRef<string | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const dismissCurrent = (immediate = false) => {
    if (!currentIdRef.current) return
    clearTimer()
    if (immediate) {
      currentIdRef.current = null
      setCurrent(null)
      setAnimState('in')
      showNext()
    } else {
      setAnimState('out')
      timerRef.current = setTimeout(() => {
        currentIdRef.current = null
        setCurrent(null)
        setAnimState('in')
        showNext()
      }, 400)
    }
  }

  const showNext = () => {
    const next = queueRef.current.shift()
    if (!next) return
    currentIdRef.current = next.id
    setCurrent(next)
    setAnimState('in')
    const duration = getBannerDurationMs()
    timerRef.current = setTimeout(() => {
      dismissCurrent()
    }, duration)
  }

  const enqueue = (event: MatchEvent) => {
    if (!isBannersEnabled()) return
    if (event.matchId !== matchId) return
    if (currentIdRef.current) {
      queueRef.current.push(event)
    } else {
      currentIdRef.current = event.id
      setCurrent(event)
      setAnimState('in')
      const duration = getBannerDurationMs()
      timerRef.current = setTimeout(() => {
        dismissCurrent()
      }, duration)
    }
  }

  useEffect(() => {
    if (!socket) return

    const onEvent = (event: MatchEvent) => {
      enqueue(event)
    }

    const onEventDeleted = (data: { id: string }) => {
      if (data.id === currentIdRef.current) {
        dismissCurrent(true)
      } else {
        queueRef.current = queueRef.current.filter(e => e.id !== data.id)
      }
    }

    const onEventsCleared = () => {
      clearTimer()
      queueRef.current = []
      currentIdRef.current = null
      setCurrent(null)
      setAnimState('in')
    }

    socket.on('match:event', onEvent)
    socket.on('match:event:deleted', onEventDeleted)
    socket.on('match:events:cleared', onEventsCleared)

    return () => {
      socket.off('match:event', onEvent)
      socket.off('match:event:deleted', onEventDeleted)
      socket.off('match:events:cleared', onEventsCleared)
      clearTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, matchId])

  if (!current) return null

  const cfg = EVENT_CONFIG[current.eventType]
  const teamName =
    current.team === 'team1' ? (team1?.name ?? 'Drużyna 1') : (team2?.name ?? 'Drużyna 2')
  const side = current.team

  return (
    <div
      className={`event-banner event-banner--${animState === 'in' ? `slide-in-${side === 'team1' ? 'left' : 'right'}` : `slide-out-${side === 'team1' ? 'left' : 'right'}`}`}
      style={{ borderColor: cfg.color, '--event-color': cfg.color } as React.CSSProperties}
    >
      <span className="event-banner__icon">{cfg.icon}</span>
      <span className="event-banner__label" style={{ color: cfg.color }}>
        {cfg.label}
      </span>
      <span className="event-banner__team">{teamName}</span>
    </div>
  )
}
