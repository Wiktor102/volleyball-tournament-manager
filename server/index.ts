import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import express from "express";
import { config } from "./config";
import { createIo } from "./socket";
import { registerHandlers } from "./socket/handlers";

const app = express();
app.use(express.json());

// In-memory token store — tokens are cleared on server restart (fine for LAN use)
const activeTokens = new Set<string>();

// ---------- Auth routes ----------

// POST /api/auth/login — verify password, issue token
app.post("/api/auth/login", (req, res) => {
	const { password } = req.body as { password?: string };
	if (!password || password !== config.adminPassword) {
		res.status(401).json({ error: "Nieprawidłowe hasło" });
		return;
	}
	const token = crypto.randomBytes(32).toString("hex");
	activeTokens.add(token);
	res.json({ token });
});

// GET /api/auth/check — validate token from Authorization header
app.get("/api/auth/check", (req, res) => {
	const auth = req.headers.authorization ?? "";
	const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
	if (!token || !activeTokens.has(token)) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}
	res.json({ ok: true });
});

// POST /api/auth/logout — revoke token
app.post("/api/auth/logout", (req, res) => {
	const auth = req.headers.authorization ?? "";
	const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
	if (token) activeTokens.delete(token);
	res.json({ ok: true });
});

// ---------- End Auth routes ----------

// Basic health
app.get("/api/health", (_req, res) => {
	res.json({ ok: true });
});

const httpServer = http.createServer(app);
const io = createIo(httpServer);

io.on("connection", socket => {
	registerHandlers(io, socket);
});

// In production, serve the built frontend (avoid dev crashes when dist is missing)
const distDir = path.resolve("dist");
if (fs.existsSync(distDir)) {
	app.use(express.static(distDir));
	// Express 5 + path-to-regexp no longer accepts a bare "*" route.
	// Use a regex to match all GET routes for SPA fallback.
	app.get(/.*/, (_req, res) => {
		res.sendFile(path.join(distDir, "index.html"));
	});
}

httpServer.listen(config.port, config.host, () => {
	const localHost = config.host === "0.0.0.0" ? "localhost" : config.host;
	console.log(`Server listening on http://${localHost}:${config.port}`);
});
