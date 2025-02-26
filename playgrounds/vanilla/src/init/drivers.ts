import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'

const dialect = new SqliteDialect({ database: new SQLite('./database.sqlite') })
export const kyselySqlite = new Kysely<any>({ dialect })
