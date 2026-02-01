import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { config } from '../config'
import * as schema from './schema'

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true })
}

const resolvedDbFile = path.resolve(config.dbFile)
ensureDir(path.dirname(resolvedDbFile))

const sqlite = new Database(resolvedDbFile)
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })
export type Db = typeof db
