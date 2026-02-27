import type { Server, Socket } from "socket.io";
import { CreateTournamentSchema, JoinTournamentSchema } from "../../utils/validation";
import { getTournamentState } from "../../services/state.service";
import {
	createTournament,
	deleteTournament,
	getTournament,
	listTournaments,
	updateTournament
} from "../../services/tournament.service";

export function registerTournamentHandlers(io: Server, socket: Socket) {
	socket.on("tournament:list", async (_payload, ack) => {
		const tournaments = await listTournaments();
		return ack?.({ ok: true, data: tournaments });
	});

	socket.on("tournament:join", async (payload, ack) => {
		const parsed = JoinTournamentSchema.safeParse(payload);
		if (!parsed.success) return ack?.({ ok: false, error: "Nieprawidłowe dane" });

		const t = await getTournament(parsed.data.tournamentId);
		if (!t) return ack?.({ ok: false, error: "Nie znaleziono turnieju" });

		socket.join(`tournament:${t.id}`);
		return ack?.({ ok: true, data: t });
	});

	socket.on("admin:tournament:create", async (payload, ack) => {
		const parsed = CreateTournamentSchema.safeParse(payload);
		if (!parsed.success) return ack?.({ ok: false, error: "Nieprawidłowe dane" });

		const t = await createTournament({ name: parsed.data.name, settings: parsed.data.settings });
		io.to(`tournament:${t.id}`).emit("tournament:updated", t);
		io.emit("tournament:list:updated"); // Notify all clients that list changed
		return ack?.({ ok: true, data: t });
	});

	socket.on("admin:tournament:update", async (payload, ack) => {
		const { tournamentId, patch } = (payload ?? {}) as {
			tournamentId?: string;
			patch?: Parameters<typeof updateTournament>[1];
		};
		if (!tournamentId || !patch) return ack?.({ ok: false, error: "Nieprawidłowe dane" });

		const updated = await updateTournament(tournamentId, patch);
		if (!updated) return ack?.({ ok: false, error: "Nie znaleziono turnieju" });

		io.to(`tournament:${updated.id}`).emit("tournament:updated", updated);
		io.emit("tournament:list:updated"); // Notify all clients that list changed
		return ack?.({ ok: true, data: updated });
	});

	socket.on("admin:tournament:delete", async (payload, ack) => {
		const { tournamentId } = (payload ?? {}) as { tournamentId?: string };
		if (!tournamentId) return ack?.({ ok: false, error: "Nieprawidłowe dane" });

		const deleted = await deleteTournament(tournamentId);
		if (!deleted) return ack?.({ ok: false, error: "Nie znaleziono turnieju" });

		io.emit("tournament:deleted", { tournamentId });
		io.emit("tournament:list:updated");
		return ack?.({ ok: true });
	});

	socket.on("tournament:default", async (_payload, ack) => {
		const tournaments = await listTournaments();
		if (tournaments.length === 0) {
			return ack?.({ ok: true, data: null });
		}

		const t = tournaments[0];
		socket.join(`tournament:${t.id}`);

		const state = await getTournamentState(t.id);
		if (state) {
			socket.emit("tournament:state", state);
			if (state.currentMatch) socket.join(`match:${state.currentMatch.id}`);
		}

		return ack?.({ ok: true, data: t });
	});
}
