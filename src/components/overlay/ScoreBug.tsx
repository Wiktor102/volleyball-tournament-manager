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

				{/* Challenge badge */}
				{challenge?.status === "pending" && <div className="ov-scorebug__challenge-badge">CHALLENGE</div>}
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
