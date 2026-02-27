const TOKEN_KEY = "admin_token";

export async function login(password: string): Promise<boolean> {
	const res = await fetch("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ password })
	});
	if (!res.ok) return false;
	const { token } = (await res.json()) as { token: string };
	localStorage.setItem(TOKEN_KEY, token);
	return true;
}

export async function logout(): Promise<void> {
	const token = localStorage.getItem(TOKEN_KEY);
	if (token) {
		await fetch("/api/auth/logout", {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` }
		});
		localStorage.removeItem(TOKEN_KEY);
	}
}

export async function checkAuth(): Promise<boolean> {
	const token = localStorage.getItem(TOKEN_KEY);
	if (!token) return false;
	const res = await fetch("/api/auth/check", {
		headers: { Authorization: `Bearer ${token}` }
	});
	return res.ok;
}

export function getToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}
