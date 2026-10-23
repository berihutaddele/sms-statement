import * as SQLite from 'expo-sqlite';
import { Txn } from './parsers/cbe';

export type Row = {
  id: number; key: string; type: 'credit' | 'debit';
  amount: number; balance: number; account: string;
  ref: string | null; sender: string | null;
  date: number; day: string; raw: string;
};

let dbp: Promise<SQLite.SQLiteDatabase> | null = null;
const getDb = () => {
  if (!dbp) {
    dbp = (async () => {
      const db = await SQLite.openDatabaseAsync('statement.db');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS txns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE,
          type TEXT, amount REAL, balance REAL, account TEXT,
          ref TEXT, sender TEXT, date INTEGER, day TEXT, raw TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_date ON txns(date);
      `);
      return db;
    })();
  }
  return dbp;
};

const p = (n: number) => String(n).padStart(2, '0');
const dayOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function saveTxns(list: Txn[]): Promise<number> {
  const db = await getDb();
  let added = 0;
  await db.withTransactionAsync(async () => {
    for (const t of list) {
      const key = t.ref ?? t.raw + t.date;
      const r = await db.runAsync(
        `INSERT OR IGNORE INTO txns
         (key,type,amount,balance,account,ref,sender,date,day,raw)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [key, t.type, t.amount, t.balance, t.account, t.ref, null,
         t.date, dayOf(t.date), t.raw]
      );
      added += r.changes;
    }
  });
  return added;
}

export async function searchTxns(q: string): Promise<Row[]> {
  const db = await getDb();
  const s = q.trim();
  if (!s) return db.getAllAsync<Row>('SELECT * FROM txns ORDER BY date DESC');
  const like = `%${s}%`;
  return db.getAllAsync<Row>(
    `SELECT * FROM txns WHERE COALESCE(sender,'') LIKE ?
       OR COALESCE(ref,'') LIKE ? OR day LIKE ?
       OR CAST(amount AS TEXT) LIKE ?
     ORDER BY date DESC`,
    [like, like, like, like]
  );
}

export async function setSender(id: number, name: string) {
  const db = await getDb();
  await db.runAsync('UPDATE txns SET sender = ? WHERE id = ?', [name.trim() || null, id]);
}
