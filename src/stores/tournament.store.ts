import { create } from 'zustand'

export type ScoringSettings = {
  mode: 'sets' | 'points' | 'timed'
  setsToWin: number
  pointsToWinSet: number
  pointsToWinTieBreak: number
  mustWinByTwo: boolean
  // Timed mode settings
  matchDurationMinutes?: number
  overtimeMinutes?: number
  goldenGoal?: boolean
}

export type RoundScoringOverride = {
  round: number | 'final' | 'semifinal' | 'thirdPlace'
  settings: Partial<ScoringSettings>
}

export type TournamentSettings = {
  scoring: ScoringSettings
  roundOverrides?: RoundScoringOverride[]
}

export type Tournament = {
  id: string
  name: string
  status: 'draft' | 'live' | 'completed'
  settings: TournamentSettings
}

export type Team = {
  id: string
  tournamentId: string
  name: string
  shortName: string | null
  color: string | null
  seed: number | null
  eliminated: boolean
}

export type TournamentState = {
  tournament: Tournament
  teams: Team[]
  currentMatch: { id: string; team1Id: string | null; team2Id: string | null } | null
  score: unknown | null
}

type State = {
  tournament: Tournament | null
  teams: Team[]
  setTournament: (t: Tournament) => void
  setTeams: (t: Team[]) => void
}

export const useTournamentStore = create<State>((set) => ({
  tournament: null,
  teams: [],
  setTournament: (t) => set({ tournament: t }),
  setTeams: (teams) => set({ teams }),
}))
