import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import express from "express";
import { config } from "./config";
import { createIo } from "./socket";
import { registerHandlers } from "./socket/handlers";

const app = express();
app.use(express.json());

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

httpServer.listen(config.port, () => {
	console.log(`Server listening on http://localhost:${config.port}`);
});
