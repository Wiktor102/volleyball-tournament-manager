import "dotenv/config";

export const config = {
	host: process.env.HOST ?? "0.0.0.0",
	port: Number(process.env.PORT ?? 5174),
	dataDir: process.env.DATA_DIR ?? "./data",
	dbFile: process.env.DB_FILE ?? "./data/tournament.db"
} as const;
