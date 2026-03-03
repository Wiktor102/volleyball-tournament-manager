import type { ChallengeState } from "../../stores/match.store";

interface ChallengeBannerProps {
	challenge: ChallengeState;
	team1Name: string;
	team2Name: string;
	team1Color?: string | null;
	team2Color?: string | null;
}

export function ChallengeBanner({ challenge, team1Name, team2Name, team1Color, team2Color }: ChallengeBannerProps) {
	if (!challenge) return null;

	const teamName = challenge.team === "team1" ? team1Name : team2Name;
	const teamColor = challenge.team === "team1" ? (team1Color ?? undefined) : (team2Color ?? undefined);

	const icon = challenge.status === "pending" ? "⚡" : challenge.status === "successful" ? "✅" : "❌";
	const label =
		challenge.status === "pending"
			? "CHALLENGE"
			: challenge.status === "successful"
				? "CHALLENGE UDANY"
				: "CHALLENGE NIEUDANY";

	return (
		<div className={`challenge-banner challenge-banner--${challenge.status}`}>
			<div className="challenge-banner__icon">{icon}</div>
			<div className="challenge-banner__text">
				<span className="challenge-banner__label">{label}</span>
				<span className="challenge-banner__team" style={{ color: teamColor }}>
					{teamName}
				</span>
				{challenge.reason && <span className="challenge-banner__reason">{challenge.reason}</span>}
			</div>
		</div>
	);
}
