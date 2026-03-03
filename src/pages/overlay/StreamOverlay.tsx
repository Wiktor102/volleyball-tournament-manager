import { useTournamentDisplay } from "../../hooks/useTournamentDisplay";
import { ScoreBug } from "../../components/overlay/ScoreBug";
import { EventBlast } from "../../components/overlay/EventBlast";
import { LowerThird } from "../../components/overlay/LowerThird";
import { CelebrationOverlay } from "../../components/overlay/CelebrationOverlayNew";
import { ChallengeOverlay } from "../../components/overlay/ChallengeOverlay";
import { StatsWidget } from "../../components/overlay/StatsWidget";
import "../../styles/overlay.css";

export function StreamOverlay() {
	const {
		tournament,
		teams,
		currentMatch,
		matchStatus,
		score,
		challenge,
		nextMatch,
		completedMatches,
		totalMatches,
		recentMatches,
		isConnected
	} = useTournamentDisplay();

	const params = new URLSearchParams(window.location.search);
	const transparent = params.get("transparent") !== "false";

	const team1 = teams.find(t => t.id === currentMatch?.team1Id);
	const team2 = teams.find(t => t.id === currentMatch?.team2Id);

	const hasActiveMatch = !!currentMatch?.id && !!currentMatch?.team1Id && !!currentMatch?.team2Id;

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
			{hasActiveMatch && currentMatch?.id && <CelebrationOverlay matchId={currentMatch.id} teams={teams} />}

			{/* Challenge overlay -- fullscreen dramatic challenge/VAR animation */}
			{hasActiveMatch && challenge && <ChallengeOverlay challenge={challenge} team1={team1} team2={team2} />}

			{/* Event Blast -- fullscreen dramatic event animation */}
			{hasActiveMatch && currentMatch?.id && <EventBlast matchId={currentMatch.id} team1={team1} team2={team2} />}

			{/* Score Bug -- compact top-left widget; hide when match has ended */}
			{hasActiveMatch && matchStatus !== "completed" && (
				<ScoreBug team1={team1} team2={team2} score={score} tournamentName={matchLabel} challenge={challenge} />
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
			{hasActiveMatch && (
				<LowerThird
					tournament={tournament}
					teams={teams}
					nextMatch={nextMatch}
					completedMatches={completedMatches}
					totalMatches={totalMatches}
					recentMatches={recentMatches ?? []}
				/>
			)}
		</div>
	);
}
