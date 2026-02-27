import { useEffect, useRef, useState } from 'react'
import type { MatchSummary } from '../../stores/tournament.store'

interface InfoRotatorProps {
  tournament: { name: string; settings: { scoring: unknown } } | null
  teams: { id: string; name: string; color?: string | null }[]
  nextMatch: MatchSummary | null
  completedMatches: number
  totalMatches: number
  rotationIntervalMs?: number
}

type Panel = {
  id: string
  content: React.ReactNode
}

export function InfoRotator({
  teams,
  nextMatch,
  completedMatches,
  totalMatches,
  rotationIntervalMs,
}: InfoRotatorProps) {
  const resolvedInterval = rotationIntervalMs ?? getRotationIntervalMs()

  const panels = buildPanels({ teams, nextMatch, completedMatches, totalMatches })

  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indexRef = useRef(0)

  // Reset index when panels change significantly
  useEffect(() => {
    indexRef.current = 0
    setActiveIndex(0)
    setVisible(true)
  }, [panels.length])

  useEffect(() => {
    if (panels.length <= 1) return
    if (!isRotatorEnabled()) return

    const rotate = () => {
      // Fade out
      setVisible(false)
      timerRef.current = setTimeout(() => {
        indexRef.current = (indexRef.current + 1) % panels.length
        setActiveIndex(indexRef.current)
        setVisible(true)
      }, 400)
    }

    const intervalId = setInterval(rotate, resolvedInterval)
    return () => {
      clearInterval(intervalId)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels.length, resolvedInterval])

  if (panels.length === 0) return null

  const safeIndex = activeIndex < panels.length ? activeIndex : 0
  const panel = panels[safeIndex]

  return (
    <div className="info-rotator">
      <div className={`info-panel ${visible ? 'info-panel--visible' : 'info-panel--hidden'}`}>
        {panel.content}
      </div>
    </div>
  )
}

function getRotationIntervalMs(): number {
  try {
    const sec = parseInt(localStorage.getItem('rotationIntervalSec') ?? '', 10)
    if (!isNaN(sec) && sec >= 3 && sec <= 15) return sec * 1000
  } catch {
    // ignore
  }
  return 5000
}

function isRotatorEnabled(): boolean {
  try {
    const val = localStorage.getItem('rotatorEnabled')
    return val === null ? true : val !== 'false'
  } catch {
    return true
  }
}

function buildPanels(props: {
  teams: { id: string; name: string; color?: string | null }[]
  nextMatch: MatchSummary | null
  completedMatches: number
  totalMatches: number
}): Panel[] {
  const { teams, nextMatch, completedMatches, totalMatches } = props
  const panels: Panel[] = []

  // Panel 1: Next match
  if (nextMatch && nextMatch.team1Id && nextMatch.team2Id) {
    const t1 = teams.find(t => t.id === nextMatch.team1Id)
    const t2 = teams.find(t => t.id === nextMatch.team2Id)
    if (t1 && t2) {
      panels.push({
        id: 'next-match',
        content: (
          <span>
            <span className="info-panel__label">Następny mecz: </span>
            <span className="info-panel__team" style={{ color: t1.color ?? '#fff' }}>
              {t1.name}
            </span>
            <span className="info-panel__vs"> vs </span>
            <span className="info-panel__team" style={{ color: t2.color ?? '#fff' }}>
              {t2.name}
            </span>
          </span>
        ),
      })
    }
  }

  // Panel 2: Tournament progress
  if (totalMatches > 0) {
    panels.push({
      id: 'progress',
      content: (
        <span>
          <span className="info-panel__label">Postęp: </span>
          <span className="info-panel__value">
            {completedMatches} / {totalMatches} meczów
          </span>
        </span>
      ),
    })
  }

  return panels
}
