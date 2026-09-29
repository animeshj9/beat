import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { distanceKm } from "../src/domain.mjs";
import { normalizeState } from "./validation.mjs";
const digest = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 24);
export function eventFromCandidate(
  candidate,
  previous,
  now = new Date().toISOString(),
) {
  const stateKey = normalizeState(candidate.newState);
  if (previous && normalizeState(previous.newState) === stateKey) return null;
  const entityId = normalizeState(candidate.entityId);
  return {
    ...candidate,
    entityId,
    id: digest(`${entityId}:${previous?.id || "initial"}:${stateKey}`),
    oldState:
      previous?.newState ?? "Previously untracked; first evidence found",
    detectedAt: now,
    effectiveDate: candidate.effectiveDate || null,
  };
}
export function sqliteStore(
  filename = process.env.SQLITE_PATH || "data/beat.sqlite",
) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, entity_id TEXT NOT NULL, detected_at TEXT NOT NULL, payload TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_entity ON events(entity_id, detected_at); CREATE TABLE IF NOT EXISTS crawl_runs(id INTEGER PRIMARY KEY, started_at TEXT, place TEXT, accepted INTEGER, rejected INTEGER, status TEXT);",
  );
  return {
    async all() {
      return db
        .prepare("SELECT payload FROM events ORDER BY detected_at DESC")
        .all()
        .map((r) => JSON.parse(r.payload));
    },
    async nearby(place) {
      return (await this.all()).filter(
        (e) => distanceKm(place, e) <= place.radius,
      );
    },
    async put(candidate) {
      const entityId = normalizeState(candidate.entityId);
      const row = db
        .prepare(
          "SELECT payload FROM events WHERE entity_id=? ORDER BY detected_at DESC, rowid DESC LIMIT 1",
        )
        .get(entityId);
      const event = eventFromCandidate(
        candidate,
        row ? JSON.parse(row.payload) : null,
      );
      if (!event) return null;
      const result = db
        .prepare("INSERT OR IGNORE INTO events VALUES(?,?,?,?)")
        .run(event.id, entityId, event.detectedAt, JSON.stringify(event));
      return result.changes ? event : null;
    },
    async log(place, accepted, rejected, status) {
      db.prepare(
        "INSERT INTO crawl_runs(started_at,place,accepted,rejected,status) VALUES(?,?,?,?,?)",
      ).run(
        new Date().toISOString(),
        JSON.stringify(place),
        accepted,
        rejected,
        status,
      );
    },
    async close() {
      db.close();
    },
  };
}
export async function postgresStore(url) {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url });
  // Run server/schema.sql once before using this adapter.
  return {
    async all() {
      return (
        await pool.query("SELECT payload FROM events ORDER BY detected_at DESC")
      ).rows.map((r) => r.payload);
    },
    async nearby(p) {
      return (
        await pool.query(
          "SELECT payload FROM events WHERE ST_DWithin(location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3) ORDER BY detected_at DESC",
          [p.longitude, p.latitude, p.radius * 1000],
        )
      ).rows.map((r) => r.payload);
    },
    async put(candidate) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const entityId = normalizeState(candidate.entityId);
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          entityId,
        ]);
        const old = await client.query(
          "SELECT payload FROM events WHERE entity_id=$1 ORDER BY detected_at DESC LIMIT 1",
          [entityId],
        );
        const e = eventFromCandidate(candidate, old.rows[0]?.payload);
        if (!e) {
          await client.query("COMMIT");
          return null;
        }
        const r = await client.query(
          "INSERT INTO events(id,entity_id,detected_at,location,payload) VALUES($1,$2,$3,ST_SetSRID(ST_MakePoint($4,$5),4326)::geography,$6) ON CONFLICT DO NOTHING RETURNING id",
          [e.id, e.entityId, e.detectedAt, e.longitude, e.latitude, e],
        );
        await client.query("COMMIT");
        return r.rowCount ? e : null;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
    async log(place, accepted, rejected, status) {
      await pool.query(
        "INSERT INTO crawl_runs(place,accepted,rejected,status) VALUES($1,$2,$3,$4)",
        [place, accepted, rejected, status],
      );
    },
    async close() {
      await pool.end();
    },
  };
}
export async function createStore() {
  return process.env.DATABASE_URL
    ? postgresStore(process.env.DATABASE_URL)
    : sqliteStore();
}
