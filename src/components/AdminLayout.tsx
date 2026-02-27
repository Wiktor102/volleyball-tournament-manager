import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSocket } from "../socket/context";
import { useToast } from "./Toast";
import { getAdminPreferences, setAdminPreferences } from "./ConfirmModal";
import { useTournamentStore } from "../stores/tournament.store";
import "../styles/admin.css";

export function AdminLayout() {
	const { connected, reconnecting } = useSocket();
	const { addToast } = useToast();
	const location = useLocation();
	const { tournament } = useTournamentStore();
	const [externalOpenPath, setExternalOpenPath] = useState<string | null>(null);
	const [settingsOpenPath, setSettingsOpenPath] = useState<string | null>(null);
	const [skipConfirmations, setSkipConfirmations] = useState(() => getAdminPreferences().skipConfirmations);

	const statsEnabled = tournament?.settings?.playerStatsEnabled === true;

	const externalRef = useRef<HTMLDivElement>(null);
	const settingsRef = useRef<HTMLDivElement>(null);

	// Close dropdowns on click outside
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (externalRef.current && !externalRef.current.contains(e.target as Node)) {
				setExternalOpenPath(null);
			}
			if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
				setSettingsOpenPath(null);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const isBracketPage = location.pathname === "/admin/bracket";
	const isMatchControlPage = location.pathname.startsWith("/admin/match/");
	const externalOpen = externalOpenPath === location.pathname;
	const settingsOpen = settingsOpenPath === location.pathname;

	return (
		<div className="admin-page">
			<header className="admin-topbar">
				<div className="admin-topbar__left">
					<NavLink to="/admin" end className="admin-topbar__brand">
						🏐 Panel admina
					</NavLink>
					<nav className="admin-topbar__nav">
						<NavLink
							to="/admin"
							end
							className={({ isActive }) =>
								`admin-topbar__link ${isActive ? "admin-topbar__link--active" : ""}`
							}
						>
							Dashboard
						</NavLink>
						<NavLink
							to="/admin/teams"
							className={({ isActive }) =>
								`admin-topbar__link ${isActive ? "admin-topbar__link--active" : ""}`
							}
						>
							Drużyny
						</NavLink>
						<NavLink
							to="/admin/bracket"
							className={({ isActive }) =>
								`admin-topbar__link ${isActive ? "admin-topbar__link--active" : ""}`
							}
						>
							Drabinka
						</NavLink>
						<NavLink
							to="/admin/tournaments"
							className={({ isActive }) =>
								`admin-topbar__link ${isActive ? "admin-topbar__link--active" : ""}`
							}
						>
							Turnieje
						</NavLink>
						{statsEnabled && (
							<NavLink
								to="/admin/stats"
								className={({ isActive }) =>
									`admin-topbar__link ${isActive ? "admin-topbar__link--active" : ""}`
								}
							>
								Statystyki
							</NavLink>
						)}
					</nav>
				</div>

				<div className="admin-topbar__right">
					<span
						className={`status-badge ${connected ? "connected" : reconnecting ? "reconnecting" : "disconnected"}`}
					>
						{connected ? "Połączono" : reconnecting ? "Łączenie..." : "Rozłączono"}
					</span>

					{/* External views dropdown */}
					<div className="admin-dropdown" ref={externalRef}>
						<button
							type="button"
							className="admin-topbar__icon-btn admin-topbar__icon-btn--external"
							onClick={() => setExternalOpenPath(externalOpen ? null : location.pathname)}
							aria-label="Widoki publiczne"
							title="Widoki publiczne"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
								<polyline points="15 3 21 3 21 9" />
								<line x1="10" y1="14" x2="21" y2="3" />
							</svg>
						</button>
						{externalOpen && (
							<div className="admin-dropdown__menu admin-dropdown__menu--right">
								<div className="admin-dropdown__header">Widoki publiczne</div>
								<a
									href="/display/fan"
									target="_blank"
									rel="noopener noreferrer"
									className="admin-dropdown__item"
								>
									<span>📺</span> Widok fanów
									<span className="admin-dropdown__external-icon">↗</span>
								</a>
								<a
									href="/display/bracket"
									target="_blank"
									rel="noopener noreferrer"
									className="admin-dropdown__item"
								>
									<span>🏆</span> Podgląd drabinki
									<span className="admin-dropdown__external-icon">↗</span>
								</a>
								<a
									href="/overlay"
									target="_blank"
									rel="noopener noreferrer"
									className="admin-dropdown__item"
								>
									<span>🎬</span> Overlay (OBS)
									<span className="admin-dropdown__external-icon">↗</span>
								</a>
							</div>
						)}
					</div>

					{/* Settings dropdown */}
					<div className="admin-dropdown" ref={settingsRef}>
						<button
							type="button"
							className="admin-topbar__icon-btn admin-topbar__icon-btn--settings"
							onClick={() => setSettingsOpenPath(settingsOpen ? null : location.pathname)}
							aria-label="Ustawienia admina"
							title="Ustawienia admina"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<circle cx="12" cy="12" r="3" />
								<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
							</svg>
						</button>
						{settingsOpen && (
							<div className="admin-dropdown__menu admin-dropdown__menu--right">
								<div className="admin-dropdown__header">Preferencje</div>
								<label className="admin-dropdown__item admin-dropdown__item--toggle">
									<input
										type="checkbox"
										checked={skipConfirmations}
										onChange={e => {
											const val = e.target.checked;
											setSkipConfirmations(val);
											setAdminPreferences({ skipConfirmations: val });
											addToast(
												val
													? "Potwierdzenia wyłączone (oprócz krytycznych)"
													: "Potwierdzenia włączone",
												"info"
											);
										}}
									/>
									Pomiń potwierdzenia
								</label>
							</div>
						)}
					</div>
				</div>
			</header>

		<div className={`admin-container ${isBracketPage ? "admin-container--bracket" : ""} ${isMatchControlPage ? "admin-container--match-control" : ""}`}>
				<Outlet />
			</div>
		</div>
	);
}
