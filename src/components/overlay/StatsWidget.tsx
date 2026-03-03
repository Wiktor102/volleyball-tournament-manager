import { useEffect, useRef, useState, useCallback } from 'react'
import { useSocket } from '../../socket/context'
import type { Team } from '../../stores/tournament.store'

interface StatsWidgetProps {
  matchId: string
  teams: Team[]
  team1: Team | undefined
  team2: Team | undefined
  tournamentId: string | undefined
  /** How long each widget is shown (ms) */
  displayDurationMs?: number
  /** Interval between widget appearances (ms) */
  intervalMs?: number
}

type MatchStats = {
  byType: Record<string, { team1: number; team2: number }>
}

type PlayerStat = {
  playerId: string
  playerName: string
  teamId: string
  teamName: string
  teamColor: string | null
  eventType: string
  count: number
}

type WidgetType =
  | 'match-comparison'
  | 'top-aces'
  | 'top-blocks'
  | 'match-events-summary'

const WIDGET_ROTATION: WidgetType[] = [
  'match-comparison',
  'top-aces',
  'top-blocks',
  'match-events-summary',
]

const EVENT_LABELS: Record<string, string> = {
  ace: 'Asy',
  'ball-out': 'Auty',
  block: 'Bloki',
  'net-touch': 'Siatka',
  challenge: 'Challenge',
  timeout: 'Timeouty',
}

function isStatsWidgetsEnabled(): boolean {
  try {
    const val = localStorage.getItem('statsWidgetsEnabled')
    return val === null ? true : val !== 'false'
  } catch { return true }
}

function getStatsIntervalMs(): number {
  try {
    const sec = parseInt(localStorage.getItem('statsIntervalSec') ?? '', 10)
    if (!isNaN(sec) && sec >= 10 && sec <= 120) return sec * 1000
  } catch { /* ignore */ }
  return 30000 // default 30s between stat widgets
}

function getStatsDisplayMs(): number {
  try {
    const sec = parseInt(localStorage.getItem('statsDisplaySec') ?? '', 10)
    if (!isNaN(sec) && sec >= 5 && sec <= 30) return sec * 1000
  } catch { /* ignore */ }
  return 8000 // default 8s display
}

export function StatsWidget({ matchId, teams, team1, team2, tournamentId }: StatsWidgetProps) {
  const { socket } = useSocket()
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([])
  const [activeWidget, setActiveWidget] = useState<WidgetType | null>(null)
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter')
  const widgetIndex = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch match stats
  const fetchMatchStats = useCallback(() => {
    if (!socket || !matchId) return
    socket.emit('stats:match:get', { matchId }, (ack: { ok: boolean; data?: { stats: MatchStats } }) => {
      if (ack.ok && ack.data) {
        setMatchStats(ack.data.stats)
      }
    })
  }, [socket, matchId])

  // Fetch player stats
  const fetchPlayerStats = useCallback(() => {
    if (!socket || !tournamentId) return
    socket.emit('stats:player:get', { tournamentId }, (ack: { ok: boolean; data?: PlayerStat[] }) => {
      if (ack.ok && ack.data) {
        setPlayerStats(ack.data)
      }
    })
  }, [socket, tournamentId])

  // Rotate widgets
  useEffect(() => {
    if (!isStatsWidgetsEnabled()) return
    if (!matchId || !team1 || !team2) return

    const interval = getStatsIntervalMs()
    const display = getStatsDisplayMs()

    const showWidget = () => {
      // Refresh data
      fetchMatchStats()
      fetchPlayerStats()

      const type = WIDGET_ROTATION[widgetIndex.current % WIDGET_ROTATION.length]
      widgetIndex.current++

      setActiveWidget(type)
      setPhase('enter')

      // After enter animation, show
      setTimeout(() => setPhase('visible'), 600)

      // Start exit
      timeoutRef.current = setTimeout(() => {
        setPhase('exit')
        setTimeout(() => setActiveWidget(null), 500)
      }, display)
    }

    // Show first widget after initial delay
    timeoutRef.current = setTimeout(() => {
      showWidget()
      intervalRef.current = setInterval(showWidget, interval + display + 1100)
    }, 5000) // initial delay

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [matchId, team1?.id, team2?.id, fetchMatchStats, fetchPlayerStats]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeWidget || !team1 || !team2) return null

  if (activeWidget === 'match-comparison') {
    return <MatchComparisonWidget matchStats={matchStats} team1={team1} team2={team2} phase={phase} />
  }

  if (activeWidget === 'top-aces') {
    const aces = playerStats
      .filter(s => s.eventType === 'ace')
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    if (aces.length === 0) return null
    return <PlayerLeaderboardWidget title="Najlepsi w Asach" icon="🏐" players={aces} teams={teams} phase={phase} />
  }

  if (activeWidget === 'top-blocks') {
    const blocks = playerStats
      .filter(s => s.eventType === 'block')
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    if (blocks.length === 0) return null
    return <PlayerLeaderboardWidget title="Najlepsi w Blokach" icon="✋" players={blocks} teams={teams} phase={phase} />
  }

  if (activeWidget === 'match-events-summary') {
    return <EventsSummaryWidget matchStats={matchStats} team1={team1} team2={team2} phase={phase} />
  }

  return null
}

// --- Sub-widgets ---

function MatchComparisonWidget({
  matchStats, team1, team2, phase
}: {
  matchStats: MatchStats | null
  team1: Team
  team2: Team
  phase: 'enter' | 'visible' | 'exit'
}) {
  if (!matchStats?.byType) return null

  const stats = Object.entries(matchStats.byType)
    .filter(([type]) => type !== 'timeout')
    .slice(0, 5)

  if (stats.length === 0) return null

  return (
    <div className={`ov-comparison ${phase === 'exit' ? 'ov-comparison--exit' : ''}`}>
      <div className="ov-comparison__header">
        <div className="ov-comparison__team-name" style={{ color: team1.color || '#fff' }}>
          {team1.name}
        </div>
        <div className="ov-comparison__title">Statystyki Meczu</div>
        <div className="ov-comparison__team-name" style={{ color: team2.color || '#fff' }}>
          {team2.name}
        </div>
      </div>
      <div className="ov-comparison__body">
        {stats.map(([type, vals], i) => {
          const total = (vals.team1 || 0) + (vals.team2 || 0)
          const pct1 = total > 0 ? (vals.team1 / total) * 100 : 50
          const pct2 = total > 0 ? (vals.team2 / total) * 100 : 50

          return (
            <div key={type} className="ov-comparison__row" style={{ '--ov-stat-delay': `${i * 0.08}s` } as React.CSSProperties}>
              <div className="ov-comparison__value" style={{ color: team1.color || '#fff' }}>
                {vals.team1 || 0}
              </div>
              <div className="ov-comparison__bar-container">
                <div
                  className="ov-comparison__bar-left"
                  style={{ width: `${pct1}%`, background: team1.color || '#FF6B35' }}
                />
                <div
                  className="ov-comparison__bar-right"
                  style={{ width: `${pct2}%`, background: team2.color || '#3b82f6' }}
                />
              </div>
              <div className="ov-comparison__label">{EVENT_LABELS[type] || type}</div>
              <div className="ov-comparison__bar-container">
                <div
                  className="ov-comparison__bar-left"
                  style={{ width: `${pct1}%`, background: team1.color || '#FF6B35' }}
                />
                <div
                  className="ov-comparison__bar-right"
                  style={{ width: `${pct2}%`, background: team2.color || '#3b82f6' }}
                />
              </div>
              <div className="ov-comparison__value" style={{ color: team2.color || '#fff' }}>
                {vals.team2 || 0}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlayerLeaderboardWidget({
  title, icon, players, teams, phase
}: {
  title: string
  icon: string
  players: PlayerStat[]
  teams: Team[]
  phase: 'enter' | 'visible' | 'exit'
}) {
  return (
    <div className={`ov-stats-widget ${phase === 'exit' ? 'ov-stats-widget--exit' : ''}`}>
      <div className="ov-stats-widget__header">
        <span className="ov-stats-widget__header-icon">{icon}</span>
        <span className="ov-stats-widget__header-title">{title}</span>
      </div>
      <div className="ov-stats-widget__body">
        {players.map((p, i) => {
          const team = teams.find(t => t.id === p.teamId)
          return (
            <div key={`${p.playerId}-${p.eventType}`} className="ov-stat-player" style={{ '--ov-stat-delay': `${i * 0.1}s` } as React.CSSProperties}>
              <div className={`ov-stat-player__rank ${i === 0 ? 'ov-stat-player__rank--gold' : ''}`}>
                {i + 1}
              </div>
              <div className="ov-stat-player__team-color" style={{ background: team?.color || '#666' }} />
              <div className="ov-stat-player__name">{p.playerName}</div>
              <div className="ov-stat-player__count">{p.count}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventsSummaryWidget({
  matchStats, team1, team2, phase
}: {
  matchStats: MatchStats | null
  team1: Team
  team2: Team
  phase: 'enter' | 'visible' | 'exit'
}) {
  if (!matchStats?.byType) return null

  const allTypes = Object.entries(matchStats.byType).filter(([type]) => type !== 'timeout')
  if (allTypes.length === 0) return null

  // Total events per team
  let totalT1 = 0
  let totalT2 = 0
  allTypes.forEach(([, v]) => {
    totalT1 += v.team1 || 0
    totalT2 += v.team2 || 0
  })

  return (
    <div className={`ov-stats-widget ${phase === 'exit' ? 'ov-stats-widget--exit' : ''}`}>
      <div className="ov-stats-widget__header">
        <span className="ov-stats-widget__header-icon">📊</span>
        <span className="ov-stats-widget__header-title">Podsumowanie</span>
      </div>
      <div className="ov-stats-widget__body">
        {allTypes.map(([type, vals], i) => {
          const t1 = vals.team1 || 0
          const t2 = vals.team2 || 0
          return (
            <div key={type} className="ov-stat-row" style={{ '--ov-stat-delay': `${i * 0.08}s` } as React.CSSProperties}>
              <div className="ov-stat-row__label">{EVENT_LABELS[type] || type}</div>
              <div className="ov-stat-row__values">
                <div className="ov-stat-row__value" style={{ color: team1.color || '#fff' }}>{t1}</div>
                <div className="ov-stat-row__value" style={{ opacity: 0.3 }}>-</div>
                <div className="ov-stat-row__value" style={{ color: team2.color || '#fff' }}>{t2}</div>
              </div>
            </div>
          )
        })}
        {/* Totals row */}
        <div className="ov-stat-row" style={{ '--ov-stat-delay': `${allTypes.length * 0.08}s`, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4, paddingTop: 12 } as React.CSSProperties}>
          <div className="ov-stat-row__label" style={{ fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>Razem</div>
          <div className="ov-stat-row__values">
            <div className="ov-stat-row__value" style={{ color: team1.color || '#fff', fontSize: 26 }}>{totalT1}</div>
            <div className="ov-stat-row__value" style={{ opacity: 0.3 }}>-</div>
            <div className="ov-stat-row__value" style={{ color: team2.color || '#fff', fontSize: 26 }}>{totalT2}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
