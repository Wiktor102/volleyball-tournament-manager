import type { CSSProperties } from "react";
import type { ChallengeState } from "../../stores/match.store";

interface ChallengeOverlayProps {
	challenge: ChallengeState;
	team1: { name: string; color?: string | null } | undefined;
	team2: { name: string; color?: string | null } | undefined;
}

export function ChallengeOverlay({ challenge, team1, team2 }: ChallengeOverlayProps) {
	if (!challenge) return null;

	const teamName = challenge.team === "team1" ? (team1?.name ?? "Druzyna 1") : (team2?.name ?? "Druzyna 2");
	const teamColor = challenge.team === "team1" ? (team1?.color ?? "#a855f7") : (team2?.color ?? "#a855f7");

	const isPending = challenge.status === "pending";
	const isResolved = challenge.status === "successful" || challenge.status === "failed";
	const resultColor = challenge.status === "successful" ? "#22c55e" : "#ef4444";

	return (
		<div
			className={`ov-challenge ${isPending ? "ov-challenge--pending" : ""} ${isResolved ? `ov-challenge--${challenge.status}` : ""}`}
			style={
				{
					"--ov-challenge-team-color": teamColor,
					"--ov-challenge-result-color": isResolved ? resultColor : undefined
				} as CSSProperties
			}
		>
			{/* Dark vignette background */}
			<div className="ov-challenge__vignette" />

			{/* Scanning line effect while pending */}
			{isPending && <div className="ov-challenge__scan-line" />}

			{/* Main content */}
			<div
				className={`ov-challenge__content ${isPending ? "ov-challenge__content--enter" : ""} ${isResolved ? "ov-challenge__content--resolve-enter" : ""}`}
			>
				{isPending && (
					<>
						<div className="ov-challenge__icon">⚡</div>
						<div className="ov-challenge__label">CHALLENGE</div>
						<div className="ov-challenge__team" style={{ color: teamColor }}>
							{teamName}
						</div>
						{challenge.reason && <div className="ov-challenge__reason">{challenge.reason}</div>}
						<div className="ov-challenge__waiting">Oczekiwanie na decyzję...</div>
					</>
				)}

				{isResolved && (
					<>
						<div className="ov-challenge__result-icon">{challenge.status === "successful" ? "✓" : "✕"}</div>
						<div className="ov-challenge__result-label" style={{ color: resultColor }}>
							{challenge.status === "successful" ? "CHALLENGE UDANY" : "CHALLENGE NIEUDANY"}
						</div>
						<div className="ov-challenge__team" style={{ color: teamColor }}>
							{teamName}
						</div>
						{challenge.reason && <div className="ov-challenge__reason">{challenge.reason}</div>}
					</>
				)}
			</div>
		</div>
	);
}
