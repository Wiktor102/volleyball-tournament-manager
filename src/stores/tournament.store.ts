import { create } from 'zustand'

export type Tournament = {
  id: string
  name: string
  status: 'draft' | 'live' | 'completed'
  settings: Record<string, unknown>
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
