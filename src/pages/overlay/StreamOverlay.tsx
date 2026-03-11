import { useEffect, useRef, useState } from "react";
import { useTournamentDisplay } from "../../hooks/useTournamentDisplay";
import { ScoreBug } from "../../components/overlay/ScoreBug";
import { EventBlast } from "../../components/overlay/EventBlast";
import { LowerThird } from "../../components/overlay/LowerThird";
import { CelebrationOverlay } from "../../components/overlay/CelebrationOverlayNew";
import { ChallengeOverlay } from "../../components/overlay/ChallengeOverlay";
import { StatsWidget } from "../../components/overlay/StatsWidget";
import "../../styles/overlay.css";

const MATCH_CELEBRATION_HOLD_MS = 30_600;

export function StreamOverlay() {
	const {
		tournament,
		teams,
		currentMatch,
		matchStatus,
		score,
		challenge,
		nextMatch,
		ballsOnBalcony,
		completedMatches,
		totalMatches,
		recentMatches,
		isConnected
	} = useTournamentDisplay();

	const [showSetHistory, setShowSetHistory] = useState(true);
	const [showLowerThird, setShowLowerThird] = useState(true);
	const [celebrationMatch, setCelebrationMatch] = useState<{
		id: string;
		team1Id: string | null;
		team2Id: string | null;
	} | null>(null);
	const celebrationHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === "h") {
				setShowSetHistory(prev => !prev);
			} else if (e.key.toLowerCase() === "n") {
				setShowLowerThird(prev => !prev);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	useEffect(() => {
		if (!currentMatch?.id) return;

		setCelebrationMatch({
			id: currentMatch.id,
			team1Id: currentMatch.team1Id,
			team2Id: currentMatch.team2Id
		});
	}, [currentMatch?.id, currentMatch?.team1Id, currentMatch?.team2Id]);

	useEffect(() => {
		if (celebrationHoldTimerRef.current) {
			clearTimeout(celebrationHoldTimerRef.current);
			celebrationHoldTimerRef.current = null;
		}

		if (currentMatch?.id) return;

		if (celebrationMatch?.id) {
			celebrationHoldTimerRef.current = setTimeout(() => {
				setCelebrationMatch(null);
				celebrationHoldTimerRef.current = null;
			}, MATCH_CELEBRATION_HOLD_MS);
			return;
		}

		setCelebrationMatch(null);
	}, [currentMatch?.id, celebrationMatch?.id]);

	useEffect(() => {
		return () => {
			if (celebrationHoldTimerRef.current) {
				clearTimeout(celebrationHoldTimerRef.current);
			}
		};
	}, []);

	const params = new URLSearchParams(window.location.search);
	const transparent = params.get("transparent") !== "false";

	const team1 = teams.find(t => t.id === currentMatch?.team1Id);
	const team2 = teams.find(t => t.id === currentMatch?.team2Id);
	const celebrationTeam1 = teams.find(t => t.id === celebrationMatch?.team1Id);
	const celebrationTeam2 = teams.find(t => t.id === celebrationMatch?.team2Id);

	const hasActiveMatch = !!currentMatch?.id && !!currentMatch?.team1Id && !!currentMatch?.team2Id;
	const hasCelebrationMatch = !!celebrationMatch?.id && !!celebrationMatch?.team1Id && !!celebrationMatch?.team2Id;

	const matchLabel = tournament?.name || "";

	return (
		<div className={`ov-root ${!transparent ? "ov-root--preview" : ""}`}>
			{/* Debug indicator (only in non-transparent mode) */}
			{!transparent && (
				<div
					style={{
						position: "absolute",
						top: 8,
						right: 12,
						opacity: 0.3,
						fontSize: 11,
						fontFamily: "var(--ov-font-condensed)",
						letterSpacing: "0.1em",
						textTransform: "uppercase" as const
					}}
				>
					{isConnected ? "CONNECTED" : "OFFLINE"}
				</div>
			)}

			{/* Celebration overlay -- fullscreen takeover for set/match wins */}
			{hasCelebrationMatch && celebrationMatch?.id && (
				<CelebrationOverlay matchId={celebrationMatch.id} team1={celebrationTeam1} team2={celebrationTeam2} />
			)}

			{/* Challenge overlay -- fullscreen dramatic challenge/VAR animation */}
			{hasActiveMatch && challenge && <ChallengeOverlay challenge={challenge} team1={team1} team2={team2} />}

			{/* Event Blast -- fullscreen dramatic event animation */}
			{hasActiveMatch && currentMatch?.id && <EventBlast matchId={currentMatch.id} team1={team1} team2={team2} />}

			{/* Score Bug -- compact top-left widget; hide when match has ended */}
			{hasActiveMatch && matchStatus !== "completed" && (
				<ScoreBug
					team1={team1}
					team2={team2}
					score={score}
					tournamentName={matchLabel}
					challenge={challenge}
					showHistory={showSetHistory}
				/>
			)}

			{/* Stats Widget -- rotating stat cards on the right side */}
			{hasActiveMatch && currentMatch?.id && (
				<StatsWidget
					matchId={currentMatch.id}
					teams={teams}
					team1={team1}
					team2={team2}
					tournamentId={tournament?.id}
				/>
			)}

			{/* Lower Third -- info ticker at the bottom */}
			{hasActiveMatch && showLowerThird && (
				<LowerThird
					tournament={tournament}
					teams={teams}
					nextMatch={nextMatch}
					ballsOnBalcony={ballsOnBalcony}
					completedMatches={completedMatches}
					totalMatches={totalMatches}
					recentMatches={recentMatches ?? []}
				/>
			)}
		</div>
	);
}
