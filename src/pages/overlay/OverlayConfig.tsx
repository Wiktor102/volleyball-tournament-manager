import { useEffect, useState } from "react";
import "../../styles/admin.css";

type OverlaySettings = {
	eventBannersEnabled: boolean;
	rotatorEnabled: boolean;
	celebrationsEnabled: boolean;
	rotationIntervalSec: number;
	bannerDurationSec: number;
};

const DEFAULTS: OverlaySettings = {
	eventBannersEnabled: true,
	rotatorEnabled: true,
	celebrationsEnabled: true,
	rotationIntervalSec: 5,
	bannerDurationSec: 3,
};

function loadSettings(): OverlaySettings {
	try {
		return {
			eventBannersEnabled:
				(localStorage.getItem("eventBannersEnabled") ?? "true") !== "false",
			rotatorEnabled:
				(localStorage.getItem("rotatorEnabled") ?? "true") !== "false",
			celebrationsEnabled:
				(localStorage.getItem("celebrationsEnabled") ?? "true") !== "false",
			rotationIntervalSec: Math.min(
				15,
				Math.max(
					3,
					parseInt(
						localStorage.getItem("rotationIntervalSec") ??
							String(DEFAULTS.rotationIntervalSec),
						10,
					) || DEFAULTS.rotationIntervalSec,
				),
			),
			bannerDurationSec: Math.min(
				10,
				Math.max(
					1,
					parseInt(
						localStorage.getItem("bannerDurationSec") ??
							String(DEFAULTS.bannerDurationSec),
						10,
					) || DEFAULTS.bannerDurationSec,
				),
			),
		};
	} catch {
		return { ...DEFAULTS };
	}
}

function saveSettings(settings: OverlaySettings) {
	try {
		localStorage.setItem(
			"eventBannersEnabled",
			String(settings.eventBannersEnabled),
		);
		localStorage.setItem("rotatorEnabled", String(settings.rotatorEnabled));
		localStorage.setItem(
			"celebrationsEnabled",
			String(settings.celebrationsEnabled),
		);
		localStorage.setItem(
			"rotationIntervalSec",
			String(settings.rotationIntervalSec),
		);
		localStorage.setItem(
			"bannerDurationSec",
			String(settings.bannerDurationSec),
		);
	} catch {
		// ignore
	}
}

export function OverlayConfig() {
	const [settings, setSettings] = useState<OverlaySettings>(loadSettings);
	const [saved, setSaved] = useState(false);

	const overlayUrl = `${window.location.origin}/overlay?transparent=true`;
	const previewUrl = `${window.location.origin}/overlay?transparent=false`;

	useEffect(() => {
		saveSettings(settings);
		setSaved(true);
		const t = setTimeout(() => setSaved(false), 1500);
		return () => clearTimeout(t);
	}, [settings]);

	const update = <K extends keyof OverlaySettings>(
		key: K,
		value: OverlaySettings[K],
	) => {
		setSettings(prev => ({ ...prev, [key]: value }));
	};

	return (
		<div className="overlay-config-page">
			<div className="overlay-config-card">
				<h1 className="overlay-config-title">Konfiguracja nakładki OBS</h1>

				{/* URL Section */}
				<section className="overlay-config-section">
					<h2 className="overlay-config-section-title">Adresy URL</h2>
					<div className="overlay-config-url-row">
						<label className="overlay-config-url-label">
							Adres do OBS (przeźroczyste tło)
						</label>
						<div className="overlay-config-url-box">
							<code className="overlay-config-url-value">{overlayUrl}</code>
							<button
								className="overlay-config-copy-btn"
								type="button"
								onClick={() => navigator.clipboard.writeText(overlayUrl)}
							>
								Kopiuj
							</button>
						</div>
					</div>
					<div className="overlay-config-url-row">
						<label className="overlay-config-url-label">
							Podgląd (ciemne tło)
						</label>
						<div className="overlay-config-url-box">
							<code className="overlay-config-url-value">{previewUrl}</code>
							<a
								className="overlay-config-copy-btn"
								href={previewUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								Otwórz
							</a>
						</div>
					</div>
				</section>

				{/* Toggle settings */}
				<section className="overlay-config-section">
					<h2 className="overlay-config-section-title">Elementy nakładki</h2>

					<label className="overlay-config-toggle">
						<input
							type="checkbox"
							checked={settings.eventBannersEnabled}
							onChange={e => update("eventBannersEnabled", e.target.checked)}
						/>
						<span>Bannery zdarzeń (as, blok, aut…)</span>
					</label>

					<label className="overlay-config-toggle">
						<input
							type="checkbox"
							checked={settings.rotatorEnabled}
							onChange={e => update("rotatorEnabled", e.target.checked)}
						/>
						<span>Rotator informacji (następny mecz, postęp)</span>
					</label>

					<label className="overlay-config-toggle">
						<input
							type="checkbox"
							checked={settings.celebrationsEnabled}
							onChange={e => update("celebrationsEnabled", e.target.checked)}
						/>
						<span>Animacje wygranego seta / meczu</span>
					</label>
				</section>

				{/* Numeric settings */}
				<section className="overlay-config-section">
					<h2 className="overlay-config-section-title">Timing</h2>

					<div className="overlay-config-slider-row">
						<label className="overlay-config-slider-label">
							Czas rotacji paneli:{" "}
							<strong>{settings.rotationIntervalSec} s</strong>
						</label>
						<input
							type="range"
							min={3}
							max={15}
							step={1}
							value={settings.rotationIntervalSec}
							onChange={e =>
								update("rotationIntervalSec", parseInt(e.target.value, 10))
							}
							className="overlay-config-range"
						/>
						<div className="overlay-config-range-labels">
							<span>3 s</span>
							<span>15 s</span>
						</div>
					</div>

					<div className="overlay-config-slider-row">
						<label className="overlay-config-slider-label">
							Czas wyświetlania bannera:{" "}
							<strong>{settings.bannerDurationSec} s</strong>
						</label>
						<input
							type="range"
							min={1}
							max={10}
							step={1}
							value={settings.bannerDurationSec}
							onChange={e =>
								update("bannerDurationSec", parseInt(e.target.value, 10))
							}
							className="overlay-config-range"
						/>
						<div className="overlay-config-range-labels">
							<span>1 s</span>
							<span>10 s</span>
						</div>
					</div>
				</section>

				{saved && (
					<div className="overlay-config-saved">Ustawienia zapisane</div>
				)}

				<div className="overlay-config-footer">
					<p>
						Ustawienia są zapisywane automatycznie w przeglądarce (localStorage).
						Nakładka OBS odczytuje je przy starcie — odśwież źródło w OBS po
						zmianie ustawień.
					</p>
				</div>
			</div>
		</div>
	);
}
