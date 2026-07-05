import { NextResponse, type NextRequest } from "next/server";
import { readJson, writeJson, rateLimit } from "@/server/storage";
import { isValidConfig, simulate, type CarConfig } from "@/lib/lapSim";

interface Entry {
  name: string;
  timeMs: number;
  config: CarConfig;
  date: string;
}

const FILE = "leaderboard.json";
const MAX_ENTRIES = 50;

/** Seeds are generated through the same simulator, so they're always beatable-but-honest. */
function seeds(): Entry[] {
  const mk = (name: string, config: CarConfig): Entry => ({
    name,
    config,
    timeMs: simulate(config).lapMs,
    date: "2026-01-01T00:00:00.000Z",
  });
  return [
    mk("M. APEX", { frontWing: "low", rearWing: "low", powerUnit: "quali", suspension: "stiff", tires: "soft" }),
    mk("L. TURBO", { frontWing: "hi", rearWing: "hi", powerUnit: "std", suspension: "stiff", tires: "soft" }),
    mk("A. CHICANE", { frontWing: "std", rearWing: "std", powerUnit: "endur", suspension: "soft", tires: "med" }),
  ];
}

async function getBoard(): Promise<Entry[]> {
  const board = await readJson<Entry[]>(FILE, []);
  if (board.length === 0) {
    const s = seeds().sort((a, b) => a.timeMs - b.timeMs);
    await writeJson(FILE, s);
    return s;
  }
  return board;
}

export async function GET() {
  const board = await getBoard();
  return NextResponse.json({ top: board.slice(0, 10) });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`lb:${ip}`, 10, 60_000)) {
    return NextResponse.json({ ok: false, error: "slow down" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const { name, config } = (body ?? {}) as { name?: unknown; config?: unknown };

  const cleanName =
    typeof name === "string" ? name.trim().replace(/[^\w .\-]/g, "").slice(0, 20) : "";
  if (cleanName.length === 0) {
    return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
  }
  if (!isValidConfig(config)) {
    return NextResponse.json({ ok: false, error: "invalid config" }, { status: 400 });
  }

  // Never trust a submitted time — recompute from the config with the same
  // simulator the client uses (shared lib/lapSim).
  const { lapMs } = simulate(config);
  const entry: Entry = {
    name: cleanName.toUpperCase(),
    timeMs: lapMs,
    config,
    date: new Date().toISOString(),
  };

  const board = await getBoard();
  board.push(entry);
  board.sort((a, b) => a.timeMs - b.timeMs);
  const trimmed = board.slice(0, MAX_ENTRIES);
  await writeJson(FILE, trimmed);

  const rank = trimmed.findIndex((e) => e === entry) + 1 || trimmed.length;
  return NextResponse.json({ ok: true, entry, rank, top: trimmed.slice(0, 10) });
}
