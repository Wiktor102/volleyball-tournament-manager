import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../utils/auth";
import "../styles/admin.css";

export function LoginPage() {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setError("");
		setLoading(true);
		const ok = await login(password);
		setLoading(false);
		if (ok) {
			navigate("/admin", { replace: true });
		} else {
			setError("Nieprawidłowe hasło. Spróbuj ponownie.");
			setPassword("");
		}
	}

	return (
		<div
			className="admin-page"
			style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}
		>
			<div
				style={{
					background: "var(--color-surface)",
					border: "1px solid var(--color-border)",
					borderRadius: "var(--radius-lg)",
					padding: "2.5rem",
					width: "100%",
					maxWidth: "380px",
					boxShadow: "var(--shadow-lg)"
				}}
			>
				<div style={{ textAlign: "center", marginBottom: "2rem" }}>
					<div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏐</div>
					<h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
						Panel Administratora
					</h1>
					<p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginTop: "0.4rem" }}>
						Turniej siatkówki
					</p>
				</div>

				<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
					<div>
						<label
							htmlFor="password"
							style={{
								display: "block",
								fontSize: "0.875rem",
								color: "var(--color-text-muted)",
								marginBottom: "0.4rem"
							}}
						>
							Hasło
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={e => setPassword(e.target.value)}
							placeholder="Wprowadź hasło"
							autoFocus
							required
							style={{
								width: "100%",
								padding: "0.6rem 0.75rem",
								background: "var(--color-bg)",
								border: `1px solid ${error ? "var(--color-danger)" : "var(--color-border)"}`,
								borderRadius: "var(--radius-sm)",
								color: "var(--color-text)",
								fontSize: "1rem",
								outline: "none",
								boxSizing: "border-box"
							}}
						/>
					</div>

					{error && <p style={{ color: "var(--color-danger)", fontSize: "0.875rem", margin: 0 }}>{error}</p>}

					<button
						type="submit"
						disabled={loading || !password}
						className="btn btn-primary"
						style={{ width: "100%", justifyContent: "center", marginTop: "0.25rem" }}
					>
						{loading ? "Logowanie…" : "Zaloguj się"}
					</button>
				</form>
			</div>
		</div>
	);
}
