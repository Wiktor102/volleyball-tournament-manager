import { useEffect, useRef, useState } from "react";
import { useSocket } from "../../socket/context";
import type { Team } from "../../stores/tournament.store";

const MATCH_WIN_DURATION_MS = 30_000;
const FULLSCREEN_OVERLAY_MAX_MS = 30_000;

interface CelebrationOverlayProps {
	matchId: string;
	teams: Team[];
}

type CelebrationState = {
	teamName: string;
	teamColor: string;
	type: "set" | "match" | "tournament";
	score?: { t1: number; t2: number };
	phase: "enter" | "visible" | "exit";
} | null;

function isCelebrationsEnabled(): boolean {
	try {
		const val = localStorage.getItem("celebrationsEnabled");
		return val === null ? true : val !== "false";
	} catch {
		return true;
	}
}

// Generate particles for the celebration burst
function generateParticles(count: number, color: string) {
	const particles = [];
	for (let i = 0; i < count; i++) {
		const angle = (360 / count) * i + Math.random() * 20;
		const distance = 300 + Math.random() * 500;
		const duration = 1.5 + Math.random() * 1;
		const delay = Math.random() * 0.3;
		const hueShift = Math.random() * 40 - 20;

		particles.push(
			<div
				key={i}
				className="ov-celebration__particle"
				style={
					{
						background: color,
						filter: `hue-rotate(${hueShift}deg)`,
						"--ov-particle-angle": `${angle}deg`,
						"--ov-particle-distance": `-${distance}px`,
						"--ov-particle-duration": `${duration}s`,
						"--ov-particle-delay": `${delay}s`,
						width: `${3 + Math.random() * 5}px`,
						height: `${10 + Math.random() * 15}px`
					} as React.CSSProperties
				}
			/>
		);
	}
	return particles;
}

export function CelebrationOverlay({ matchId, teams }: CelebrationOverlayProps) {
	const { socket } = useSocket();
	const [celebration, setCelebration] = useState<CelebrationState>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const prevSetsRef = useRef<{ team1Sets: number; team2Sets: number } | null>(null);
	const lastCompletedMatchRef = useRef<string | null>(null);

	const particles = celebration
		? generateParticles(
				celebration.type === "tournament" ? 60 : celebration.type === "match" ? 40 : 20,
				celebration.teamColor
			)
		: null;

	const triggerCelebration = (
		teamName: string,
		teamColor: string,
		type: "set" | "match" | "tournament",
		durationMs: number,
		score?: { t1: number; t2: number }
	) => {
		if (!isCelebrationsEnabled()) return;
		if (timerRef.current) clearTimeout(timerRef.current);
		if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);

		const clearCelebration = () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			if (safetyTimerRef.current) {
				clearTimeout(safetyTimerRef.current);
				safetyTimerRef.current = null;
			}

			setCelebration(prev => (prev ? { ...prev, phase: "exit" } : null));
			setTimeout(() => {
				setCelebration(null);
			}, 600);
		};

		setCelebration({ teamName, teamColor, type, score, phase: "enter" });

		// Move to visible after enter animation
		setTimeout(() => {
			setCelebration(prev => (prev ? { ...prev, phase: "visible" } : null));
		}, 700);

		const safeDurationMs = Math.min(durationMs, FULLSCREEN_OVERLAY_MAX_MS);
		timerRef.current = setTimeout(clearCelebration, safeDurationMs);
		safetyTimerRef.current = setTimeout(clearCelebration, FULLSCREEN_OVERLAY_MAX_MS);
	};

	useEffect(() => {
		if (!socket) return;

		const onScore = (s: {
			matchId?: string;
			team1Sets?: number;
			team2Sets?: number;
			team1Id?: string;
			team2Id?: string;
			team1CurrentPoints?: number;
			team2CurrentPoints?: number;
		}) => {
			if (s.matchId && s.matchId !== matchId) return;

			const t1Sets = s.team1Sets ?? 0;
			const t2Sets = s.team2Sets ?? 0;
			const prev = prevSetsRef.current;

			if (prev) {
				if (t1Sets > prev.team1Sets) {
					const team = teams.find(t => t.id === s.team1Id);
					triggerCelebration(team?.name ?? "Druzyna 1", team?.color ?? "#FFD23F", "set", 3000, {
						t1: t1Sets,
						t2: t2Sets
					});
				} else if (t2Sets > prev.team2Sets) {
					const team = teams.find(t => t.id === s.team2Id);
					triggerCelebration(team?.name ?? "Druzyna 2", team?.color ?? "#FFD23F", "set", 3000, {
						t1: t1Sets,
						t2: t2Sets
					});
				}
			}

			prevSetsRef.current = { team1Sets: t1Sets, team2Sets: t2Sets };
		};

		const onMatchStatus = (m: { id?: string; status?: string; winnerId?: string | null }) => {
			if (m.id && m.id !== matchId) return;
			if (m.status !== "completed") {
				lastCompletedMatchRef.current = null;
				return;
			}

			if (m.status === "completed" && m.winnerId) {
				const completedKey = `${m.id ?? matchId}:${m.winnerId}`;
				if (lastCompletedMatchRef.current === completedKey) return;
				lastCompletedMatchRef.current = completedKey;

				const team = teams.find(t => t.id === m.winnerId);
				triggerCelebration(team?.name ?? "Zwyciezca", team?.color ?? "#FFD23F", "match", MATCH_WIN_DURATION_MS);
			}
		};

		socket.on("match:score", onScore);
		socket.on("match:status", onMatchStatus);

		return () => {
			socket.off("match:score", onScore);
			socket.off("match:status", onMatchStatus);
			// Do NOT clear celebration timers here — this effect re-runs whenever
			// `teams` updates (socket data), which would cancel active dismiss timers.
		};
	}, [socket, matchId, teams]);

	// Separate cleanup: only cancel timers when the component unmounts.
	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
		};
	}, []);

	if (!celebration) return null;

	const isExit = celebration.phase === "exit";
	const typeClass = `ov-celebration--${celebration.type}`;
	const exitClass = isExit ? "ov-celebration--exit" : "";

	return (
		<div className={`ov-celebration ${typeClass} ${exitClass}`}>
			<div className="ov-celebration__vignette" />

			{/* Particles */}
			<div className="ov-celebration__particles">{particles}</div>

			{/* Shockwave ring */}
			{!isExit && (
				<div
					className="ov-celebration__shockwave"
					style={{ "--ov-team-color": celebration.teamColor } as React.CSSProperties}
				/>
			)}

			{/* Content */}
			<div className="ov-celebration__content">
				{celebration.type === "match" || celebration.type === "tournament" ? (
					<div className="ov-celebration__crown">{celebration.type === "tournament" ? "👑" : "🏆"}</div>
				) : null}

				<div className="ov-celebration__team-name" style={{ color: celebration.teamColor }}>
					{celebration.teamName}
				</div>

				<div className="ov-celebration__subtitle">
					{celebration.type === "tournament"
						? "Mistrz Turnieju!"
						: celebration.type === "match"
							? "Wygrywa Mecz!"
							: "Wygrywa Set!"}
				</div>

				{celebration.score && (
					<div className="ov-celebration__score">
						<span style={{ color: celebration.teamColor }}>{celebration.score.t1}</span>
						<span className="ov-celebration__score-sep">:</span>
						<span>{celebration.score.t2}</span>
					</div>
				)}
			</div>
		</div>
	);
}
