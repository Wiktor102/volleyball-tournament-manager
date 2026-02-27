import { useRef, useEffect } from "react";
import { useTournamentDisplay } from "../../hooks/useTournamentDisplay";
import { EventBanner } from "../../components/overlay/EventBanner";
import { InfoRotator } from "../../components/overlay/InfoRotator";
import { CelebrationOverlay } from "../../components/overlay/CelebrationOverlay";
import "../../styles/admin.css";

export function StreamOverlay() {
	const {
		tournament,
		teams,
		currentMatch,
		score,
		nextMatch,
		completedMatches,
		totalMatches,
		isConnected,
	} = useTournamentDisplay();

	const team1ScoreElRef = useRef<HTMLDivElement | null>(null);
	const team2ScoreElRef = useRef<HTMLDivElement | null>(null);
	const prevScoreRef = useRef<{ t1: number; t2: number } | null>(null);

	const pulse = (el: HTMLElement | null) => {
		if (!el) return;
		el.classList.remove("score-changed");
		void el.offsetWidth;
		el.classList.add("score-changed");
		window.setTimeout(() => el.classList.remove("score-changed"), 400);
	};

	// Track score changes for animations
	useEffect(() => {
		if (!score) return;
		const prev = prevScoreRef.current;
		if (prev) {
			if (score.team1CurrentPoints !== prev.t1) pulse(team1ScoreElRef.current);
			if (score.team2CurrentPoints !== prev.t2) pulse(team2ScoreElRef.current);
		}
		prevScoreRef.current = {
			t1: score.team1CurrentPoints,
			t2: score.team2CurrentPoints,
		};
	}, [score]);

	const params = new URLSearchParams(window.location.search);
	const transparent = params.get("transparent") !== "false";

	const team1 = teams.find(t => t.id === currentMatch?.team1Id);
	const team2 = teams.find(t => t.id === currentMatch?.team2Id);

	const hasActiveMatch =
		!!currentMatch?.id && !!currentMatch?.team1Id && !!currentMatch?.team2Id;

	return (
		<div className={`overlay-page ${!transparent ? "with-bg" : ""}`}>
			{/* Celebration overlay — behind everything else visually but covers the screen */}
			{hasActiveMatch && currentMatch?.id && (
				<CelebrationOverlay matchId={currentMatch.id} teams={teams} />
			)}

			{/* Debug indicator (only in non-transparent mode) */}
			{!transparent && (
				<div
					style={{
						position: "absolute",
						top: 24,
						left: 24,
						opacity: 0.4,
						fontSize: 12,
					}}
				>
					Overlay ({isConnected ? "online" : "offline"})
				</div>
			)}

			{/* Score Bar */}
			{hasActiveMatch && (
				<div className="overlay-scorebar">
					<div
						className="overlay-team"
						style={{ color: team1?.color || "#ffffff" }}
					>
						{team1?.name ?? "DRUŻYNA 1"}
					</div>
					<div className="overlay-scores">
						{/* Sets display */}
						{(score?.setsToWin ?? 3) > 1 && (
							<div className="overlay-sets">
								<span style={{ color: team1?.color || "#ffffff" }}>
									{score?.team1Sets ?? 0}
								</span>
								<span className="overlay-sets-label">SETY</span>
								<span style={{ color: team2?.color || "#ffffff" }}>
									{score?.team2Sets ?? 0}
								</span>
							</div>
						)}
						<div ref={team1ScoreElRef} className="overlay-score">
							{score?.team1CurrentPoints ?? 0}
						</div>
						<div className="overlay-separator">:</div>
						<div ref={team2ScoreElRef} className="overlay-score">
							{score?.team2CurrentPoints ?? 0}
						</div>
					</div>
					<div
						className="overlay-team"
						style={{
							color: team2?.color || "#ffffff",
							textAlign: "right",
						}}
					>
						{team2?.name ?? "DRUŻYNA 2"}
					</div>
				</div>
			)}

			{/* Info Rotator — appears below the score bar */}
			{hasActiveMatch && (
				<InfoRotator
					tournament={tournament}
					teams={teams}
					nextMatch={nextMatch}
					completedMatches={completedMatches}
					totalMatches={totalMatches}
				/>
			)}

			{/* Event Banner */}
			{hasActiveMatch && currentMatch?.id && (
				<EventBanner
					matchId={currentMatch.id}
					team1={team1}
					team2={team2}
				/>
			)}
		</div>
	);
}
