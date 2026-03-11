import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config";

export type TournamentRuntimeState = {
	ballsOnBalcony: number;
};

type RuntimeStateFile = {
	tournaments: Record<string, TournamentRuntimeState>;
};

const DEFAULT_TOURNAMENT_RUNTIME_STATE: TournamentRuntimeState = {
	ballsOnBalcony: 0
};

const runtimeStateFilePath = path.join(config.dataDir, "runtime-state.json");

let runtimeStateCache: RuntimeStateFile | null = null;
let loadPromise: Promise<RuntimeStateFile> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function cloneTournamentRuntimeState(state?: Partial<TournamentRuntimeState> | null): TournamentRuntimeState {
	return {
		ballsOnBalcony: state?.ballsOnBalcony ?? DEFAULT_TOURNAMENT_RUNTIME_STATE.ballsOnBalcony
	};
}

async function loadRuntimeState(): Promise<RuntimeStateFile> {
	if (runtimeStateCache) return runtimeStateCache;
	if (loadPromise) return loadPromise;

	loadPromise = (async () => {
		try {
			const raw = await fs.readFile(runtimeStateFilePath, "utf8");
			const parsed = JSON.parse(raw) as Partial<RuntimeStateFile>;
			const loadedState: RuntimeStateFile = {
				tournaments: Object.fromEntries(
					Object.entries(parsed.tournaments ?? {}).map(([tournamentId, state]) => [
						tournamentId,
						cloneTournamentRuntimeState(state)
					])
				)
			};
			runtimeStateCache = loadedState;
			return loadedState;
		} catch {
			const emptyState: RuntimeStateFile = { tournaments: {} };
			runtimeStateCache = emptyState;
			return emptyState;
		} finally {
			loadPromise = null;
		}
	})();

	return loadPromise;
}

async function persistRuntimeState(state: RuntimeStateFile) {
	await fs.mkdir(config.dataDir, { recursive: true });
	await fs.writeFile(runtimeStateFilePath, JSON.stringify(state, null, 2), "utf8");
}

async function saveRuntimeState(state: RuntimeStateFile) {
	runtimeStateCache = state;
	writeQueue = writeQueue.then(() => persistRuntimeState(state));
	await writeQueue;
}

export async function getTournamentRuntimeState(tournamentId: string): Promise<TournamentRuntimeState> {
	const state = await loadRuntimeState();
	return cloneTournamentRuntimeState(state.tournaments[tournamentId]);
}

export async function setTournamentBallsOnBalcony(
	tournamentId: string,
	ballsOnBalcony: number
): Promise<TournamentRuntimeState> {
	const state = await loadRuntimeState();
	state.tournaments[tournamentId] = {
		...cloneTournamentRuntimeState(state.tournaments[tournamentId]),
		ballsOnBalcony
	};
	await saveRuntimeState(state);
	return cloneTournamentRuntimeState(state.tournaments[tournamentId]);
}

export async function deleteTournamentRuntimeState(tournamentId: string): Promise<void> {
	const state = await loadRuntimeState();
	if (!(tournamentId in state.tournaments)) return;
	delete state.tournaments[tournamentId];
	await saveRuntimeState(state);
}
