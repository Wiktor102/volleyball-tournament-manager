import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 5174),
  dataDir: process.env.DATA_DIR ?? './data',
  dbFile: process.env.DB_FILE ?? './data/tournament.db',
} as const
