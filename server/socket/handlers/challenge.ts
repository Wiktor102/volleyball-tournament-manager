import type { Server, Socket } from "socket.io";
import { ChallengeStartSchema, ChallengeResolveSchema } from "../../utils/validation";

export type ChallengeState = {
	matchId: string;
	team: "team1" | "team2";
	reason?: string;
	status: "pending" | "successful" | "failed";
	timestamp: number;
};

// In-memory challenge state, keyed by matchId
const activeChallenges = new Map<string, ChallengeState>();

export function getChallengeState(matchId: string): ChallengeState | null {
	return activeChallenges.get(matchId) ?? null;
}

export function registerChallengeHandlers(io: Server, socket: Socket) {
	socket.on("admin:challenge:start", (payload, ack) => {
		const parsed = ChallengeStartSchema.safeParse(payload);
		if (!parsed.success) return ack?.({ ok: false, error: "Nieprawidłowe dane" });

		const state: ChallengeState = {
			matchId: parsed.data.matchId,
			team: parsed.data.team,
			reason: parsed.data.reason,
			status: "pending",
			timestamp: Date.now()
		};
		activeChallenges.set(parsed.data.matchId, state);
		io.to(`match:${parsed.data.matchId}`).emit("match:challenge", state);
		return ack?.({ ok: true, data: state });
	});

	socket.on("admin:challenge:resolve", (payload, ack) => {
		const parsed = ChallengeResolveSchema.safeParse(payload);
		if (!parsed.success) return ack?.({ ok: false, error: "Nieprawidłowe dane" });

		const existing = activeChallenges.get(parsed.data.matchId);
		if (!existing || existing.status !== "pending") {
			return ack?.({ ok: false, error: "Brak aktywnego challenge" });
		}

		const resolved: ChallengeState = {
			...existing,
			status: parsed.data.result
		};
		activeChallenges.set(parsed.data.matchId, resolved);
		io.to(`match:${parsed.data.matchId}`).emit("match:challenge", resolved);

		// Auto-clear after delay so overlay can show the result animation
		setTimeout(() => {
			activeChallenges.delete(parsed.data.matchId);
			io.to(`match:${parsed.data.matchId}`).emit("match:challenge", null);
		}, 8000);

		return ack?.({ ok: true, data: resolved });
	});

	socket.on("match:challenge:get", (payload, ack) => {
		const matchId = (payload as { matchId?: string })?.matchId;
		if (!matchId) return ack?.({ ok: false, error: "Nieprawidłowe dane" });
		return ack?.({ ok: true, data: activeChallenges.get(matchId) ?? null });
	});
}
