import { promises as fs } from "fs";
import path from "path";

/**
 * Tiny JSON-file persistence for the two endpoints. A single write queue
 * serializes mutations so concurrent requests can't interleave writes.
 * Swap for SQLite/Postgres by reimplementing these three functions.
 *
 * Serverless hosts (Vercel) ship a read-only filesystem except /tmp, which
 * is writable but ephemeral per instance — not durable, but enough to avoid
 * throwing on every request. Local dev keeps real, persistent storage.
 */

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "formula-code-data")
  : path.join(process.cwd(), "server", "data");

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => {});
  return next;
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(file: string, data: unknown): Promise<void> {
  return enqueue(async () => {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(
        path.join(DATA_DIR, file),
        JSON.stringify(data, null, 2),
        "utf8",
      );
    } catch (err) {
      // Best-effort persistence: never let a read-only/ephemeral filesystem
      // crash the request (e.g. contact form emailing should still work).
      console.error(`writeJson(${file}) failed:`, err);
    }
  });
}

/** naive fixed-window per-IP rate limiter (in-memory, per server process) */
const hits = new Map<string, { count: number; windowStart: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    hits.set(key, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}
