import { useEffect, useRef, useState } from "react";
import "../../styles/overlay.css";

type OverlaySettings = {
	eventBannersEnabled: boolean;
	rotatorEnabled: boolean;
	celebrationsEnabled: boolean;
	statsWidgetsEnabled: boolean;
	rotationIntervalSec: number;
	bannerDurationSec: number;
	statsIntervalSec: number;
	statsDisplaySec: number;
};

const DEFAULTS: OverlaySettings = {
	eventBannersEnabled: true,
	rotatorEnabled: true,
	celebrationsEnabled: true,
	statsWidgetsEnabled: true,
	rotationIntervalSec: 6,
	bannerDurationSec: 3,
	statsIntervalSec: 30,
	statsDisplaySec: 8
};

function loadSettings(): OverlaySettings {
	try {
		return {
			eventBannersEnabled: (localStorage.getItem("eventBannersEnabled") ?? "true") !== "false",
			rotatorEnabled: (localStorage.getItem("rotatorEnabled") ?? "true") !== "false",
			celebrationsEnabled: (localStorage.getItem("celebrationsEnabled") ?? "true") !== "false",
			statsWidgetsEnabled: (localStorage.getItem("statsWidgetsEnabled") ?? "true") !== "false",
			rotationIntervalSec: clamp(
				parseInt(localStorage.getItem("rotationIntervalSec") ?? String(DEFAULTS.rotationIntervalSec), 10) ||
					DEFAULTS.rotationIntervalSec,
				3,
				15
			),
			bannerDurationSec: clamp(
				parseInt(localStorage.getItem("bannerDurationSec") ?? String(DEFAULTS.bannerDurationSec), 10) ||
					DEFAULTS.bannerDurationSec,
				1,
				10
			),
			statsIntervalSec: clamp(
				parseInt(localStorage.getItem("statsIntervalSec") ?? String(DEFAULTS.statsIntervalSec), 10) ||
					DEFAULTS.statsIntervalSec,
				10,
				120
			),
			statsDisplaySec: clamp(
				parseInt(localStorage.getItem("statsDisplaySec") ?? String(DEFAULTS.statsDisplaySec), 10) ||
					DEFAULTS.statsDisplaySec,
				5,
				30
			)
		};
	} catch {
		return { ...DEFAULTS };
	}
}

function saveSettings(settings: OverlaySettings) {
	try {
		localStorage.setItem("eventBannersEnabled", String(settings.eventBannersEnabled));
		localStorage.setItem("rotatorEnabled", String(settings.rotatorEnabled));
		localStorage.setItem("celebrationsEnabled", String(settings.celebrationsEnabled));
		localStorage.setItem("statsWidgetsEnabled", String(settings.statsWidgetsEnabled));
		localStorage.setItem("rotationIntervalSec", String(settings.rotationIntervalSec));
		localStorage.setItem("bannerDurationSec", String(settings.bannerDurationSec));
		localStorage.setItem("statsIntervalSec", String(settings.statsIntervalSec));
		localStorage.setItem("statsDisplaySec", String(settings.statsDisplaySec));
	} catch {
		/* ignore */
	}
}

function clamp(val: number, min: number, max: number) {
	return Math.min(max, Math.max(min, val));
}

export function OverlayConfig() {
	const [settings, setSettings] = useState<OverlaySettings>(loadSettings);
	const [saved, setSaved] = useState(false);
	const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const overlayUrl = `${window.location.origin}/overlay?transparent=true`;
	const previewUrl = `${window.location.origin}/overlay?transparent=false`;

	useEffect(() => {
		return () => {
			if (savedTimerRef.current) {
				clearTimeout(savedTimerRef.current);
				savedTimerRef.current = null;
			}
		};
	}, []);

	const markSaved = () => {
		setSaved(true);
		if (savedTimerRef.current) {
			clearTimeout(savedTimerRef.current);
		}
		savedTimerRef.current = setTimeout(() => {
			setSaved(false);
			savedTimerRef.current = null;
		}, 1500);
	};

	const update = <K extends keyof OverlaySettings>(key: K, value: OverlaySettings[K]) => {
		setSettings(prev => {
			const next = { ...prev, [key]: value };
			saveSettings(next);
			return next;
		});
		markSaved();
	};

	return (
		<div className="ov-config-page">
			<div className="ov-config-card">
				<h1 className="ov-config-title">Konfiguracja Nakladki OBS</h1>

				{/* URL Section */}
				<section className="ov-config-section">
					<h2 className="ov-config-section-title">Adresy URL</h2>
					<div className="ov-config-url-row">
						<label className="ov-config-url-label">Adres do OBS (przezroczyste tlo)</label>
						<div className="ov-config-url-box">
							<code className="ov-config-url-value">{overlayUrl}</code>
							<button
								className="ov-config-copy-btn"
								type="button"
								onClick={() => navigator.clipboard.writeText(overlayUrl)}
							>
								Kopiuj
							</button>
						</div>
					</div>
					<div className="ov-config-url-row">
						<label className="ov-config-url-label">Podglad (ciemne tlo)</label>
						<div className="ov-config-url-box">
							<code className="ov-config-url-value">{previewUrl}</code>
							<a className="ov-config-copy-btn" href={previewUrl} target="_blank" rel="noopener noreferrer">
								Otworz
							</a>
						</div>
					</div>
				</section>

				{/* Component toggles */}
				<section className="ov-config-section">
					<h2 className="ov-config-section-title">Elementy nakladki</h2>

					<label className="ov-config-toggle">
						<input
							type="checkbox"
							checked={settings.eventBannersEnabled}
							onChange={e => update("eventBannersEnabled", e.target.checked)}
						/>
						<span>Animacje zdarzen (as, blok, aut...)</span>
					</label>

					<label className="ov-config-toggle">
						<input
							type="checkbox"
							checked={settings.rotatorEnabled}
							onChange={e => update("rotatorEnabled", e.target.checked)}
						/>
						<span>Dolny pasek informacyjny (nastepny mecz, postep)</span>
					</label>

					<label className="ov-config-toggle">
						<input
							type="checkbox"
							checked={settings.celebrationsEnabled}
							onChange={e => update("celebrationsEnabled", e.target.checked)}
						/>
						<span>Animacje wygranego seta / meczu</span>
					</label>

					<label className="ov-config-toggle">
						<input
							type="checkbox"
							checked={settings.statsWidgetsEnabled}
							onChange={e => update("statsWidgetsEnabled", e.target.checked)}
						/>
						<span>Widgety statystyk (porownanie, ranking)</span>
					</label>
				</section>

				{/* Timing */}
				<section className="ov-config-section">
					<h2 className="ov-config-section-title">Timing</h2>

					<div className="ov-config-slider-row">
						<label className="ov-config-slider-label">
							Rotacja dolnego paska: <strong>{settings.rotationIntervalSec} s</strong>
						</label>
						<input
							type="range"
							min={3}
							max={15}
							step={1}
							value={settings.rotationIntervalSec}
							onChange={e => update("rotationIntervalSec", parseInt(e.target.value, 10))}
							className="ov-config-range"
						/>
						<div className="ov-config-range-labels">
							<span>3 s</span>
							<span>15 s</span>
						</div>
					</div>

					<div className="ov-config-slider-row">
						<label className="ov-config-slider-label">
							Czas animacji zdarzenia: <strong>{settings.bannerDurationSec} s</strong>
						</label>
						<input
							type="range"
							min={1}
							max={10}
							step={1}
							value={settings.bannerDurationSec}
							onChange={e => update("bannerDurationSec", parseInt(e.target.value, 10))}
							className="ov-config-range"
						/>
						<div className="ov-config-range-labels">
							<span>1 s</span>
							<span>10 s</span>
						</div>
					</div>

					<div className="ov-config-slider-row">
						<label className="ov-config-slider-label">
							Czestotliwosc statystyk: <strong>co {settings.statsIntervalSec} s</strong>
						</label>
						<input
							type="range"
							min={10}
							max={120}
							step={5}
							value={settings.statsIntervalSec}
							onChange={e => update("statsIntervalSec", parseInt(e.target.value, 10))}
							className="ov-config-range"
						/>
						<div className="ov-config-range-labels">
							<span>10 s</span>
							<span>120 s</span>
						</div>
					</div>

					<div className="ov-config-slider-row">
						<label className="ov-config-slider-label">
							Czas wyswietlania statystyk: <strong>{settings.statsDisplaySec} s</strong>
						</label>
						<input
							type="range"
							min={5}
							max={30}
							step={1}
							value={settings.statsDisplaySec}
							onChange={e => update("statsDisplaySec", parseInt(e.target.value, 10))}
							className="ov-config-range"
						/>
						<div className="ov-config-range-labels">
							<span>5 s</span>
							<span>30 s</span>
						</div>
					</div>
				</section>

				{saved && <div className="ov-config-saved">Ustawienia zapisane</div>}

				<div className="ov-config-footer">
					<p>
						Ustawienia sa zapisywane automatycznie w przegladarce (localStorage). Nakladka OBS odczytuje je przy
						starcie -- odswiez zrodlo w OBS po zmianie ustawien.
					</p>
				</div>
			</div>
		</div>
	);
}
