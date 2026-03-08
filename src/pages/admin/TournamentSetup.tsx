import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../../socket/context";
import {
	useTournamentStore,
	type Tournament,
	type ScoringSettings,
	type TournamentSettings,
	type RoundScoringOverride
} from "../../stores/tournament.store";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmModal";
import "../../styles/admin.css";

type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

// ── Scoring presets ─────────────────────────────────────────────────────────

type ScoringPreset = {
	id: string;
	name: string;
	description: string;
	settings: ScoringSettings;
};

const SCORING_PRESETS: ScoringPreset[] = [
	{
		id: "fixed2x11_totalpoints",
		name: "2 sety po 15 pkt (punkty decydują)",
		description:
			"Zawsze rozgrywane są 2 sety do 15 punktów. Przy wyniku 1:1 o awansie decyduje większa liczba łącznie zdobytych punktów. Jeśli punkty są remisowe – gra się na przewagę (pierwsze 2-punktowe prowadzenie).",
		settings: {
			mode: "sets",
			setsToWin: 2,
			pointsToWinSet: 15,
			pointsToWinTieBreak: 15,
			mustWinByTwo: true,
			tiebreakByTotalPoints: true
		}
	},
	{
		id: "classic2x15",
		name: "Do 2 setów po 15 pkt",
		description:
			"Klasyczny system meczowy. Wygrywa drużyna, która pierwsza zdobędzie 2 sety do 15 punktów (z przewagą 2 pkt). Przy 1:1 rozgrywany jest decydujący 3. set.",
		settings: {
			mode: "sets",
			setsToWin: 2,
			pointsToWinSet: 15,
			pointsToWinTieBreak: 15,
			mustWinByTwo: true,
			tiebreakByTotalPoints: false
		}
	},
	{
		id: "classic2x25",
		name: "Do 2 setów po 25 pkt",
		description:
			"Standardowe zasady siatkówki. Pierwsza drużyna z 2 wygranymi setami do 25 punktów. Przy 1:1 – decydujący set do 15 pkt.",
		settings: {
			mode: "sets",
			setsToWin: 2,
			pointsToWinSet: 25,
			pointsToWinTieBreak: 15,
			mustWinByTwo: true,
			tiebreakByTotalPoints: false
		}
	},
	{
		id: "timed",
		name: "Na czas",
		description:
			"Mecz rozgrywany na czas. Po upływie czasu wygrywa drużyna z większą liczbą punktów. Opcjonalna dogrywka lub złoty gol.",
		settings: {
			mode: "timed",
			setsToWin: 1,
			pointsToWinSet: 25,
			pointsToWinTieBreak: 15,
			mustWinByTwo: false,
			tiebreakByTotalPoints: false,
			matchDurationMinutes: 10,
			overtimeMinutes: 2,
			goldenGoal: true
		}
	},
	{
		id: "custom",
		name: "Własny",
		description: "Skonfiguruj wszystkie parametry punktacji ręcznie.",
		settings: {
			mode: "sets",
			setsToWin: 2,
			pointsToWinSet: 25,
			pointsToWinTieBreak: 15,
			mustWinByTwo: true,
			tiebreakByTotalPoints: false,
			matchDurationMinutes: 10,
			overtimeMinutes: 2,
			goldenGoal: true
		}
	}
];

/** Determine which preset id best matches the given settings (or 'custom'). */
function detectPresetId(settings: ScoringSettings): string {
	for (const preset of SCORING_PRESETS) {
		if (preset.id === "custom") continue;
		const s = preset.settings;
		if (
			s.mode === settings.mode &&
			s.setsToWin === settings.setsToWin &&
			s.pointsToWinSet === settings.pointsToWinSet &&
			s.pointsToWinTieBreak === settings.pointsToWinTieBreak &&
			s.mustWinByTwo === settings.mustWinByTwo &&
			(s.tiebreakByTotalPoints ?? false) === (settings.tiebreakByTotalPoints ?? false)
		) {
			return preset.id;
		}
	}
	return "custom";
}

// ── ScoringPresetSelector ───────────────────────────────────────────────────

function ScoringPresetSelector({
	value,
	onChange
}: {
	value: ScoringSettings;
	onChange: (settings: ScoringSettings) => void;
}) {
	const activePresetId = detectPresetId(value);

	const handlePresetClick = (preset: ScoringPreset) => {
		if (preset.id === "custom") {
			// Keep current settings but switch to 'custom' display (no-op on settings)
			// We still call onChange to ensure the parent re-renders with activePresetId=custom
			onChange({ ...value });
		} else {
			onChange({ ...preset.settings });
		}
	};

	const updateCustom = (patch: Partial<ScoringSettings>) => {
		onChange({ ...value, ...patch });
	};

	return (
		<>
			{/* Preset cards */}
			<div className="scoring-presets">
				{SCORING_PRESETS.map(preset => (
					<button
						key={preset.id}
						type="button"
						className={`scoring-preset-card ${activePresetId === preset.id ? "active" : ""}`}
						onClick={() => handlePresetClick(preset)}
					>
						<span className="scoring-preset-name">{preset.name}</span>
						<span className="scoring-preset-desc">{preset.description}</span>
					</button>
				))}
			</div>

			{/* Custom form (only when 'custom' preset is selected) */}
			{activePresetId === "custom" && (
				<div className="custom-scoring-form">
					<div className="form-group">
						<label className="form-label">Tryb punktacji</label>
						<div className="btn-group">
							<button
								className={`btn btn-sm ${value.mode === "sets" ? "btn-primary" : "btn-secondary"}`}
								onClick={() => updateCustom({ mode: "sets" })}
							>
								Sety (siatkówka)
							</button>
							<button
								className={`btn btn-sm ${value.mode === "points" ? "btn-primary" : "btn-secondary"}`}
								onClick={() => updateCustom({ mode: "points" })}
							>
								Tylko punkty
							</button>
							<button
								className={`btn btn-sm ${value.mode === "timed" ? "btn-primary" : "btn-secondary"}`}
								onClick={() => updateCustom({ mode: "timed" })}
							>
								Na czas
							</button>
						</div>
					</div>

					{value.mode === "sets" && (
						<>
							<div className="form-row">
								<div className="form-group">
									<label className="form-label">Sety do wygranej</label>
									<select
										className="form-input"
										value={value.setsToWin}
										onChange={e => updateCustom({ setsToWin: Number(e.target.value) })}
									>
										<option value={1}>1 (do 1 seta)</option>
										<option value={2}>2 (do 2 setów – best of 3)</option>
										<option value={3}>3 (do 3 setów – best of 5)</option>
									</select>
								</div>
								<div className="form-group">
									<label className="form-label">Punkty do wygranej seta</label>
									<select
										className="form-input"
										value={value.pointsToWinSet}
										onChange={e => updateCustom({ pointsToWinSet: Number(e.target.value) })}
									>
										<option value={11}>11 punktów</option>
										<option value={15}>15 punktów</option>
										<option value={21}>21 punktów</option>
										<option value={25}>25 punktów</option>
									</select>
								</div>
							</div>

							<div className="form-row">
								<div className="form-group">
									<label className="form-label">Rozstrzygnięcie przy remisie setów</label>
									<div className="btn-group">
										<button
											className={`btn btn-sm ${!value.tiebreakByTotalPoints ? "btn-primary" : "btn-secondary"}`}
											onClick={() => updateCustom({ tiebreakByTotalPoints: false })}
										>
											Decydujący set
										</button>
										<button
											className={`btn btn-sm ${value.tiebreakByTotalPoints ? "btn-primary" : "btn-secondary"}`}
											onClick={() => updateCustom({ tiebreakByTotalPoints: true })}
										>
											Punkty łączne
										</button>
									</div>
									<span className="text-muted text-sm" style={{ marginTop: "0.25rem", display: "block" }}>
										{value.tiebreakByTotalPoints
											? "Przy remisie setów: wygrywa drużyna z większą łączną liczbą punktów. Jeśli punkty równe – gra na przewagę."
											: "Przy remisie setów: rozgrywany jest decydujący (tie-break) set."}
									</span>
								</div>

								{!value.tiebreakByTotalPoints && (
									<div className="form-group">
										<label className="form-label">Punkty w decydującym secie</label>
										<select
											className="form-input"
											value={value.pointsToWinTieBreak}
											onChange={e => updateCustom({ pointsToWinTieBreak: Number(e.target.value) })}
										>
											<option value={11}>11 punktów</option>
											<option value={15}>15 punktów</option>
											<option value={21}>21 punktów</option>
										</select>
									</div>
								)}
							</div>

							<div className="form-row">
								<div className="form-group">
									<label className="form-label">Przewaga 2 punktów</label>
									<div className="btn-group">
										<button
											className={`btn btn-sm ${value.mustWinByTwo ? "btn-primary" : "btn-secondary"}`}
											onClick={() => updateCustom({ mustWinByTwo: true })}
										>
											Tak
										</button>
										<button
											className={`btn btn-sm ${!value.mustWinByTwo ? "btn-primary" : "btn-secondary"}`}
											onClick={() => updateCustom({ mustWinByTwo: false })}
										>
											Nie
										</button>
									</div>
								</div>
							</div>
						</>
					)}

					{value.mode === "timed" && (
						<>
							<div className="form-row">
								<div className="form-group">
									<label className="form-label">Czas meczu (minuty)</label>
									<select
										className="form-input"
										value={value.matchDurationMinutes ?? 10}
										onChange={e => updateCustom({ matchDurationMinutes: Number(e.target.value) })}
									>
										<option value={5}>5 minut</option>
										<option value={7}>7 minut</option>
										<option value={10}>10 minut</option>
										<option value={15}>15 minut</option>
										<option value={20}>20 minut</option>
									</select>
								</div>
								<div className="form-group">
									<label className="form-label">Dogrywka (minuty)</label>
									<select
										className="form-input"
										value={value.overtimeMinutes ?? 2}
										onChange={e => updateCustom({ overtimeMinutes: Number(e.target.value) })}
									>
										<option value={0}>Brak dogrywki</option>
										<option value={1}>1 minuta</option>
										<option value={2}>2 minuty</option>
										<option value={3}>3 minuty</option>
										<option value={5}>5 minut</option>
									</select>
								</div>
							</div>
							<div className="form-group">
								<label className="form-label">Złoty gol (pierwszy punkt w dogrywce wygrywa)</label>
								<div className="btn-group">
									<button
										className={`btn btn-sm ${value.goldenGoal ? "btn-primary" : "btn-secondary"}`}
										onClick={() => updateCustom({ goldenGoal: true })}
									>
										Tak
									</button>
									<button
										className={`btn btn-sm ${!value.goldenGoal ? "btn-primary" : "btn-secondary"}`}
										onClick={() => updateCustom({ goldenGoal: false })}
									>
										Nie
									</button>
								</div>
							</div>
						</>
					)}
				</div>
			)}
		</>
	);
}

// ── RoundOverridesEditor ────────────────────────────────────────────────────

const ROUND_LABELS: Record<string, string> = {
	final: "Finał",
	semifinal: "Półfinały",
	thirdPlace: "Mecz o 3. miejsce",
	"1": "Runda 1",
	"2": "Runda 2",
	"3": "Runda 3",
	"4": "Runda 4"
};

function RoundOverridesEditor({
	overrides,
	defaultScoring,
	onChange
}: {
	overrides: RoundScoringOverride[];
	defaultScoring: ScoringSettings;
	onChange: (overrides: RoundScoringOverride[]) => void;
}) {
	const addOverride = () => {
		const usedRounds = new Set(overrides.map(o => String(o.round)));
		// Pick first unused round
		const candidates = ["final", "semifinal", "thirdPlace", "1", "2", "3", "4"];
		const round = candidates.find(r => !usedRounds.has(r)) ?? "final";
		onChange([
			...overrides,
			{
				round: (isNaN(Number(round)) ? round : Number(round)) as RoundScoringOverride["round"],
				settings: { ...defaultScoring }
			}
		]);
	};

	const removeOverride = (index: number) => onChange(overrides.filter((_, i) => i !== index));

	const updateOverrideRound = (index: number, round: string) => {
		const next = [...overrides];
		next[index] = {
			...next[index],
			round: (isNaN(Number(round)) ? round : Number(round)) as RoundScoringOverride["round"]
		};
		onChange(next);
	};

	const updateOverrideSettings = (index: number, settings: ScoringSettings) => {
		const next = [...overrides];
		next[index] = { ...next[index], settings };
		onChange(next);
	};

	return (
		<>
			{overrides.length === 0 && (
				<p className="text-muted text-sm" style={{ marginBottom: "1rem" }}>
					Brak nadpisań – wszystkie rundy używają ustawień domyślnych.
				</p>
			)}

			{overrides.map((override, index) => {
				const effectiveSettings: ScoringSettings = {
					...defaultScoring,
					...override.settings
				};

				return (
					<div
						key={index}
						className="card"
						style={{ marginBottom: "1rem", border: "1px solid var(--border-color)" }}
					>
						<div className="flex gap-2 items-center" style={{ marginBottom: "0.75rem", flexWrap: "wrap" }}>
							<select
								className="form-input"
								value={String(override.round)}
								onChange={e => updateOverrideRound(index, e.target.value)}
								style={{ width: "auto" }}
							>
								{Object.entries(ROUND_LABELS).map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
							<span className="text-muted">→ inne ustawienia punktacji:</span>
							<button
								className="btn btn-danger btn-sm"
								style={{ marginLeft: "auto" }}
								onClick={() => removeOverride(index)}
							>
								Usuń
							</button>
						</div>

						<ScoringPresetSelector value={effectiveSettings} onChange={s => updateOverrideSettings(index, s)} />
					</div>
				);
			})}

			<button className="btn btn-secondary" onClick={addOverride}>
				+ Dodaj nadpisanie dla rundy
			</button>
		</>
	);
}

// ── Main component ──────────────────────────────────────────────────────────

const DEFAULT_SCORING: ScoringSettings = {
	mode: "sets",
	setsToWin: 2,
	pointsToWinSet: 25,
	pointsToWinTieBreak: 15,
	mustWinByTwo: true,
	tiebreakByTotalPoints: false,
	matchDurationMinutes: 10,
	overtimeMinutes: 2,
	goldenGoal: true
};

export function TournamentSetup() {
	const { id } = useParams<{ id?: string }>();
	const navigate = useNavigate();
	const { socket } = useSocket();
	const { setTournament } = useTournamentStore();
	const { addToast } = useToast();
	const confirm = useConfirm();

	const isNew = !id || id === "new";

	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [name, setName] = useState("");
	const [status, setStatus] = useState<Tournament["status"]>("draft");
	const [scoring, setScoring] = useState<ScoringSettings>(DEFAULT_SCORING);
	const [roundOverrides, setRoundOverrides] = useState<RoundScoringOverride[]>([]);
	const [originalTournament, setOriginalTournament] = useState<Tournament | null>(null);

	// Load existing tournament
	useEffect(() => {
		if (!socket || isNew) return;

		socket.emit("tournament:join", { tournamentId: id }, (ack: Ack<Tournament>) => {
			setLoading(false);
			if (!ack.ok) {
				addToast("Nie znaleziono turnieju", "error");
				navigate("/admin");
				return;
			}
			setOriginalTournament(ack.data);
			setName(ack.data.name);
			setStatus(ack.data.status);
			setScoring(ack.data.settings?.scoring ?? DEFAULT_SCORING);
			setRoundOverrides(ack.data.settings?.roundOverrides ?? []);
		});
	}, [socket, id, isNew, navigate, addToast]);

	const handleSave = useCallback(() => {
		if (!socket || !name.trim()) return;

		setSaving(true);
		const settings: TournamentSettings = {
			scoring,
			roundOverrides: roundOverrides.length > 0 ? roundOverrides : undefined
		};

		if (isNew) {
			socket.emit("admin:tournament:create", { name: name.trim(), settings }, (ack: Ack<Tournament>) => {
				setSaving(false);
				if (!ack.ok) {
					addToast(ack.error, "error");
					return;
				}
				setTournament(ack.data);
				addToast("Turniej utworzony", "success");
				navigate("/admin");
			});
		} else {
			socket.emit(
				"admin:tournament:update",
				{ tournamentId: id, patch: { name: name.trim(), status, settings } },
				(ack: Ack<Tournament>) => {
					setSaving(false);
					if (!ack.ok) {
						addToast(ack.error, "error");
						return;
					}
					setTournament(ack.data);
					addToast("Turniej zaktualizowany", "success");
					navigate("/admin");
				}
			);
		}
	}, [socket, name, scoring, roundOverrides, status, isNew, id, setTournament, addToast, navigate]);

	const handleDelete = useCallback(async () => {
		if (!socket || !id || isNew) return;
		const confirmed = await confirm({
			title: "Usuń turniej",
			message:
				"Czy na pewno chcesz usunąć ten turniej? Ta operacja jest nieodwracalna i usunie wszystkie drużyny, zawodników i mecze.",
			confirmText: "Usuń turniej",
			danger: true,
			requireTypedConfirmation: "USUŃ"
		});
		if (!confirmed) return;

		socket.emit("admin:tournament:delete", { tournamentId: id }, (ack: { ok: boolean; error?: string }) => {
			if (!ack.ok) {
				addToast(ack.error ?? "Błąd usuwania", "error");
				return;
			}
			addToast("Turniej usunięty", "success");
			navigate("/admin");
		});
	}, [socket, id, isNew, confirm, addToast, navigate]);

	if (loading) {
		return (
			<div className="admin-page">
				<div className="admin-container">
					<div className="text-muted">Ładowanie...</div>
				</div>
			</div>
		);
	}

	const hasChanges =
		isNew ||
		name !== originalTournament?.name ||
		status !== originalTournament?.status ||
		JSON.stringify(scoring) !== JSON.stringify(originalTournament?.settings?.scoring ?? DEFAULT_SCORING) ||
		JSON.stringify(roundOverrides) !== JSON.stringify(originalTournament?.settings?.roundOverrides ?? []);

	return (
		<>
			<div className="page-header">
				<div className="flex items-center gap-2">
					<Link to="/admin" className="btn btn-secondary btn-sm">
						←
					</Link>
					<h1>{isNew ? "Nowy turniej" : "Edytuj turniej"}</h1>
				</div>
			</div>

			{/* Basic Info */}
			<div className="card">
				<div className="card-header">
					<h2>Informacje podstawowe</h2>
				</div>
				<div className="form-group">
					<label className="form-label">Nazwa turnieju *</label>
					<input
						className="form-input"
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="np. Turniej siatkówki 2026"
					/>
				</div>

				{!isNew && (
					<div className="form-group">
						<label className="form-label">Status</label>
						<div className="btn-group">
							<button
								className={`btn btn-sm ${status === "draft" ? "btn-primary" : "btn-secondary"}`}
								onClick={() => setStatus("draft")}
							>
								Szkic
							</button>
							<button
								className={`btn btn-sm ${status === "live" ? "btn-success" : "btn-secondary"}`}
								onClick={() => setStatus("live")}
							>
								W trakcie
							</button>
							<button
								className={`btn btn-sm ${status === "completed" ? "btn-primary" : "btn-secondary"}`}
								onClick={() => setStatus("completed")}
							>
								Zakończony
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Scoring Settings */}
			<div className="card">
				<div className="card-header">
					<h2>Ustawienia punktacji (domyślne)</h2>
					<span className="text-muted text-sm">
						Te ustawienia będą używane dla wszystkich rund, chyba że zostaną nadpisane poniżej.
					</span>
				</div>
				<ScoringPresetSelector value={scoring} onChange={setScoring} />
			</div>

			{/* Round Overrides */}
			<div className="card">
				<div className="card-header">
					<h2>Nadpisania dla rund</h2>
					<span className="text-muted text-sm">
						Ustaw inne zasady punktacji dla wybranych rund (np. finały na inny system).
					</span>
				</div>
				<RoundOverridesEditor overrides={roundOverrides} defaultScoring={scoring} onChange={setRoundOverrides} />
			</div>

			{/* Actions */}
			<div className="card">
				<div className="flex gap-2">
					<button
						className="btn btn-primary"
						onClick={handleSave}
						disabled={saving || !name.trim() || !hasChanges}
					>
						{saving ? "Zapisywanie..." : isNew ? "Utwórz turniej" : "Zapisz zmiany"}
					</button>
					<Link to="/admin" className="btn btn-secondary">
						Anuluj
					</Link>
					{!isNew && (
						<button className="btn btn-danger" onClick={handleDelete} style={{ marginLeft: "auto" }}>
							Usuń turniej
						</button>
					)}
				</div>
			</div>
		</>
	);
}
