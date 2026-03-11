import { useEffect, useRef, useState } from "react";
import type { MatchSummary, Team } from "../../stores/tournament.store";

interface LowerThirdProps {
	tournament: { name: string } | null;
	teams: Team[];
	nextMatch: MatchSummary | null;
	ballsOnBalcony: number;
	completedMatches: number;
	totalMatches: number;
	recentMatches: MatchSummary[];
	rotationIntervalMs?: number;
}

type PanelData = {
	id: string;
	tag: string;
	content: React.ReactNode;
};

function isRotatorEnabled(): boolean {
	try {
		const val = localStorage.getItem("rotatorEnabled");
		return val === null ? true : val !== "false";
	} catch {
		return true;
	}
}

function getRotationIntervalMs(): number {
	try {
		const sec = parseInt(localStorage.getItem("rotationIntervalSec") ?? "", 10);
		if (!isNaN(sec) && sec >= 3 && sec <= 15) return sec * 1000;
	} catch {
		/* ignore */
	}
	return 6000;
}

export function LowerThird({
	tournament,
	teams,
	nextMatch,
	ballsOnBalcony,
	completedMatches,
	totalMatches,
	recentMatches,
	rotationIntervalMs
}: LowerThirdProps) {
	const interval = rotationIntervalMs ?? getRotationIntervalMs();
	const panels = buildPanels({
		teams,
		nextMatch,
		ballsOnBalcony,
		completedMatches,
		totalMatches,
		recentMatches,
		tournamentName: tournament?.name
	});

	const [activeIndex, setActiveIndex] = useState(0);
	const [phase, setPhase] = useState<"visible" | "exit">("visible");
	const indexRef = useRef(0);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (panels.length <= 1) return;
		if (!isRotatorEnabled()) return;

		const rotate = () => {
			setPhase("exit");
			timerRef.current = setTimeout(() => {
				indexRef.current = (indexRef.current + 1) % panels.length;
				setActiveIndex(indexRef.current);
				setPhase("visible");
			}, 400);
		};

		const intervalId = setInterval(rotate, interval);
		return () => {
			clearInterval(intervalId);
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [panels.length, interval]);

	if (panels.length === 0) return null;

	const safeIndex = activeIndex < panels.length ? activeIndex : 0;
	const panel = panels[safeIndex];

	return (
		<div className="ov-lower-third">
			<div className="ov-lower-third__accent" />
			<div className="ov-lower-third__content">
				<div
					className={`ov-lower-third__panel ${phase === "exit" ? "ov-lower-third__panel--exit" : ""}`}
					key={panel.id}
				>
					<span className="ov-lower-third__tag">{panel.tag}</span>
					{panel.content}
				</div>
			</div>
		</div>
	);
}

function buildPanels(props: {
	teams: Team[];
	nextMatch: MatchSummary | null;
	ballsOnBalcony: number;
	completedMatches: number;
	totalMatches: number;
	recentMatches: MatchSummary[];
	tournamentName?: string;
}): PanelData[] {
	const { teams, nextMatch, ballsOnBalcony, completedMatches, totalMatches, recentMatches, tournamentName } = props;
	const panels: PanelData[] = [];

	// Panel: Next match
	if (nextMatch && nextMatch.team1Id && nextMatch.team2Id) {
		const t1 = teams.find(t => t.id === nextMatch.team1Id);
		const t2 = teams.find(t => t.id === nextMatch.team2Id);
		if (t1 && t2) {
			panels.push({
				id: "next-match",
				tag: "Dalej",
				content: (
					<>
						<span className="ov-lower-third__text">
							<span className="ov-lower-third__team-name" style={{ color: t1.color || "#fff" }}>
								{t1.name}
							</span>
							<span className="ov-lower-third__vs"> vs </span>
							<span className="ov-lower-third__team-name" style={{ color: t2.color || "#fff" }}>
								{t2.name}
							</span>
						</span>
					</>
				)
			});
		}
	}

	// Panel: Tournament progress
	if (totalMatches > 0) {
		const pct = Math.round((completedMatches / totalMatches) * 100);
		panels.push({
			id: "progress",
			tag: "Turniej",
			content: (
				<>
					<span className="ov-lower-third__text">
						{completedMatches} / {totalMatches} meczów rozegranych
					</span>
					<div className="ov-lower-third__progress-bar">
						<div className="ov-lower-third__bar">
							<div className="ov-lower-third__bar-fill" style={{ width: `${pct}%` }} />
						</div>
						<span>{pct}%</span>
					</div>
				</>
			)
		});
	}

	panels.push({
		id: "balls-on-balcony",
		tag: "Stat",
		content: (
			<span className="ov-lower-third__text">
				Piłki na balkonie: <strong>{ballsOnBalcony}</strong>
			</span>
		)
	});

	// Panel: Last completed match result
	const lastCompleted = recentMatches.find(m => m.status === "completed" && m.winnerId);
	if (lastCompleted) {
		const t1 = teams.find(t => t.id === lastCompleted.team1Id);
		const t2 = teams.find(t => t.id === lastCompleted.team2Id);
		const winner = teams.find(t => t.id === lastCompleted.winnerId);
		if (t1 && t2 && winner) {
			const s = lastCompleted.score;
			const scoreText = s ? `${s.team1Sets} : ${s.team2Sets}` : "";
			panels.push({
				id: "last-result",
				tag: "Wynik",
				content: (
					<span className="ov-lower-third__text">
						<span className="ov-lower-third__team-name" style={{ color: t1.color || "#fff" }}>
							{t1.name}
						</span>
						{scoreText && (
							<span
								style={{
									margin: "0 10px",
									fontFamily: "var(--ov-font-display)",
									fontWeight: 700,
									fontSize: 22
								}}
							>
								{scoreText}
							</span>
						)}
						<span className="ov-lower-third__team-name" style={{ color: t2.color || "#fff" }}>
							{t2.name}
						</span>
					</span>
				)
			});
		}
	}

	// Panel: Tournament name
	if (tournamentName) {
		panels.push({
			id: "tournament-name",
			tag: "Live",
			content: (
				<span className="ov-lower-third__text" style={{ letterSpacing: "0.04em" }}>
					{tournamentName}
				</span>
			)
		});
	}

	return panels;
}
