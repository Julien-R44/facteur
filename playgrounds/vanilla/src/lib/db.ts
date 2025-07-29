// @ts-ignore
import SQLite from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'

const dialect = new SqliteDialect({ database: new SQLite(':memory:') })
export const db = new Kysely<any>({ dialect })
