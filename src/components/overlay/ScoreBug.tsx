import { useEffect, useRef } from "react";
import type { MatchScore, SetScore, ChallengeState } from "../../stores/match.store";
import type { Team } from "../../stores/tournament.store";

interface ScoreBugProps {
	team1: Team | undefined;
	team2: Team | undefined;
	score: MatchScore | null;
	tournamentName: string;
	matchLabel?: string;
	challenge?: ChallengeState;
}

function isAttachedAdvantageStage(score: MatchScore): boolean {
	const config = score.scoringMode;
	if (!config || config.mode !== "sets" || !config.tiebreakByTotalPoints) return false;

	const setsToWin = score.setsToWin ?? config.setsToWin ?? 2;
	const regularSetCount = setsToWin * 2 - 2;
	if (regularSetCount < 1) return false;

	const completedTotals = (score.setScores ?? []).reduce((acc, s) => ({ t1: acc.t1 + s.t1, t2: acc.t2 + s.t2 }), {
		t1: 0,
		t2: 0
	});

	return (
		Math.abs(score.team1Sets - score.team2Sets) === 1 &&
		Math.max(score.team1Sets, score.team2Sets) === setsToWin - 1 &&
		score.currentSet === regularSetCount &&
		(score.setScores?.length ?? 0) >= regularSetCount &&
		completedTotals.t1 === completedTotals.t2
	);
}

export function ScoreBug({ team1, team2, score, tournamentName, matchLabel, challenge }: ScoreBugProps) {
	const t1PointsRef = useRef<HTMLDivElement>(null);
	const t2PointsRef = useRef<HTMLDivElement>(null);
	const prevRef = useRef<{ t1: number; t2: number } | null>(null);

	useEffect(() => {
		if (!score) return;
		const prev = prevRef.current;
		if (prev) {
			if (score.team1CurrentPoints !== prev.t1) flash(t1PointsRef.current);
			if (score.team2CurrentPoints !== prev.t2) flash(t2PointsRef.current);
		}
		prevRef.current = { t1: score.team1CurrentPoints, t2: score.team2CurrentPoints };
	}, [score]);

	if (!team1 || !team2 || !score) return null;

	const hasSets = (score.setsToWin ?? 1) > 1;
	const setScores = score.setScores ?? [];
	const headerText = matchLabel || tournamentName;
	const isAdvantageStage = isAttachedAdvantageStage(score);
	const showChallengeBadge = challenge?.status === "pending";

	return (
		<>
			<div className="ov-scorebug">
				{/* Header bar */}
				<div className="ov-scorebug__header">
					{headerText}
					<span className="ov-live-badge">
						<span className="ov-live-badge__dot" />
						LIVE
					</span>
				</div>

				{/* Body */}
				<div className="ov-scorebug__body">
					{/* Team 1 */}
					<div className="ov-scorebug__team">
						<div className="ov-scorebug__color" style={{ background: team1.color || "#666" }} />
						<div className="ov-scorebug__name">{team1.name}</div>
						{hasSets && <div className="ov-scorebug__sets">{score.team1Sets}</div>}
						<div ref={t1PointsRef} className="ov-scorebug__points">
							{score.team1CurrentPoints}
						</div>
					</div>

					{/* Team 2 */}
					<div className="ov-scorebug__team">
						<div className="ov-scorebug__color" style={{ background: team2.color || "#666" }} />
						<div className="ov-scorebug__name">{team2.name}</div>
						{hasSets && <div className="ov-scorebug__sets">{score.team2Sets}</div>}
						<div ref={t2PointsRef} className="ov-scorebug__points">
							{score.team2CurrentPoints}
						</div>
					</div>
				</div>

				{/* Set indicator */}
				{hasSets && (
					<div className="ov-scorebug__set-indicator">
						Set <span>{score.currentSet}</span>
					</div>
				)}

				{/* State badges */}
				{(isAdvantageStage || showChallengeBadge) && (
					<div className="ov-scorebug__badges">
						{isAdvantageStage && <div className="ov-scorebug__advantage-badge">⚡ PRZEWAGA</div>}
						{showChallengeBadge && <div className="ov-scorebug__challenge-badge">CHALLENGE</div>}
					</div>
				)}
			</div>

			{/* Set history below scorebug */}
			{hasSets && setScores.length > 0 && (
				<SetHistory setScores={setScores} team1Color={team1.color} team2Color={team2.color} />
			)}
		</>
	);
}

function SetHistory({
	setScores,
	team1Color,
	team2Color
}: {
	setScores: SetScore[];
	team1Color: string | null;
	team2Color: string | null;
}) {
	return (
		<div className="ov-set-history">
			{setScores.map((s, i) => {
				const t1Won = s.t1 > s.t2;
				return (
					<div key={i} className="ov-set-history__row">
						<div className="ov-set-history__set-label">Set {i + 1}</div>
						<div
							className={`ov-set-history__score ${t1Won ? "ov-set-history__score--winner" : ""}`}
							style={t1Won ? { color: team1Color || "#FFD23F" } : undefined}
						>
							{s.t1}
						</div>
						<div className="ov-set-history__sep">-</div>
						<div
							className={`ov-set-history__score ${!t1Won ? "ov-set-history__score--winner" : ""}`}
							style={!t1Won ? { color: team2Color || "#FFD23F" } : undefined}
						>
							{s.t2}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function flash(el: HTMLElement | null) {
	if (!el) return;
	el.classList.remove("ov-scorebug__points--changed");
	void el.offsetWidth;
	el.classList.add("ov-scorebug__points--changed");
	setTimeout(() => el.classList.remove("ov-scorebug__points--changed"), 600);
}
