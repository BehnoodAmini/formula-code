"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "@/lib/gsapSetup";
import { useStore } from "@/lib/store";
import {
  SETUP_CATEGORIES,
  simulate,
  BASELINE,
  formatLap,
  formatDelta,
  type CarConfig,
  type OptionDef,
} from "@/lib/lapSim";
import styles from "./BuildGame.module.css";

interface BoardEntry {
  name: string;
  timeMs: number;
  config: CarConfig;
}

/**
 * Option icons: every choice is encoded as shape + code + label, so no state
 * is communicated by color alone (tire compounds get color AS WELL, matching
 * the rings on the 3D model — but S/M/H letters and the dot icon carry it).
 */
function OptionIcon({ opt, catKey }: { opt: OptionDef; catKey: string }) {
  const tireColors: Record<string, string> = {
    soft: "#ff2800",
    med: "#e8c34a",
    hard: "#9a9aa2",
  };
  const stroke = "var(--text-secondary)";
  const fill =
    catKey === "tires" ? tireColors[opt.id] ?? stroke : "transparent";

  return (
    <svg viewBox="0 0 20 20" className={styles.icon} aria-hidden="true">
      {opt.shape === "wedge" && <path d="M2 15 L18 15 L18 6 Z" fill="none" stroke={stroke} strokeWidth="1.5" />}
      {opt.shape === "bar" && <rect x="3" y="7" width="14" height="6" fill="none" stroke={stroke} strokeWidth="1.5" />}
      {opt.shape === "ring" && <circle cx="10" cy="10" r="6.5" fill="none" stroke={stroke} strokeWidth="1.5" />}
      {opt.shape === "coil" && (
        <path d="M3 14 L6 6 L9 14 L12 6 L15 14 L17 9" fill="none" stroke={stroke} strokeWidth="1.5" />
      )}
      {opt.shape === "dot" && <circle cx="10" cy="10" r="7" fill={fill} opacity="0.9" />}
      <text x="10" y="13" textAnchor="middle">
        {opt.short}
      </text>
    </svg>
  );
}

export default function BuildGame({ active }: { active: boolean }) {
  const config = useStore((s) => s.config);
  const setConfigOption = useStore((s) => s.setConfigOption);
  const reduceMotion = useStore((s) => s.reduceMotion);

  const sim = useMemo(() => simulate(config), [config]);
  const delta = sim.lapMs - BASELINE.lapMs;

  // lap time counts toward the new value instead of snapping (telemetry feel)
  const [displayMs, setDisplayMs] = useState(sim.lapMs);
  const proxy = useRef({ v: sim.lapMs });
  useEffect(() => {
    if (reduceMotion) {
      setDisplayMs(sim.lapMs);
      return;
    }
    const tween = gsap.to(proxy.current, {
      v: sim.lapMs,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => setDisplayMs(Math.round(proxy.current.v)),
    });
    return () => {
      tween.kill();
    };
  }, [sim.lapMs, reduceMotion]);

  // leaderboard
  const [board, setBoard] = useState<BoardEntry[] | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; msg: string }>({
    kind: "idle",
    msg: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [myBest, setMyBest] = useState<number | null>(null);

  useEffect(() => {
    if (!active || board !== null) return;
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => setBoard(data.top ?? []))
      .catch(() => setBoard([]));
  }, [active, board]);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setStatus({ kind: "idle", msg: "TRANSMITTING…" });
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "rejected");
      setBoard(data.top);
      setMyBest(data.entry.timeMs);
      setStatus({
        kind: "ok",
        msg: `LOGGED ${formatLap(data.entry.timeMs)} — P${data.rank} ON THE BOARD`,
      });
    } catch (e) {
      setStatus({
        kind: "err",
        msg: `PIT WALL REJECTED IT: ${e instanceof Error ? e.message : "unknown error"}`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // gauge ranges chosen to make differences visible across the option space
  const speedPct = Math.min(100, Math.max(4, ((sim.topSpeed - 300) / 50) * 100));
  const gripPct = Math.min(100, Math.max(4, ((sim.grip - 3.0) / 2.4) * 100));

  return (
    <div className={styles.game}>
      {SETUP_CATEGORIES.map((cat) => (
        <div key={cat.key} className={styles.category}>
          <p className={styles.categoryLabel} id={`cat-${cat.key}`}>
            {cat.label}
          </p>
          <div className={styles.options} role="radiogroup" aria-labelledby={`cat-${cat.key}`}>
            {cat.options.map((opt) => {
              const selected = config[cat.key] === opt.id;
              return (
                <button
                  key={opt.id}
                  role="radio"
                  aria-checked={selected}
                  title={opt.desc}
                  className={`${styles.option} ${selected ? styles.optionActive : ""}`}
                  onClick={() =>
                    setConfigOption(cat.key, opt.id as CarConfig[typeof cat.key])
                  }
                >
                  <OptionIcon opt={opt} catKey={cat.key} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className={styles.readout} aria-live="polite">
        <p className={styles.lapLabel}>SIMULATED LAP — CIRCUITO DEL CODICE (5.1 KM)</p>
        <div className={styles.lapRow}>
          <span className={styles.lapTime}>{formatLap(displayMs)}</span>
          <span className={delta <= 0 ? styles.deltaFaster : styles.deltaSlower}>
            {delta <= 0 ? "▼" : "▲"} {formatDelta(delta)}s VS BASELINE ·{" "}
            {delta <= 0 ? "FASTER" : "SLOWER"}
          </span>
        </div>
        <div className={styles.gauges}>
          <div className={styles.gauge}>
            <span>TOP SPEED</span>
            <div className={styles.gaugeTrack}>
              <div className={styles.gaugeFill} style={{ width: `${speedPct}%` }} />
            </div>
            <span className={styles.gaugeValue}>{sim.topSpeed} km/h</span>
          </div>
          <div className={styles.gauge}>
            <span>CORNER GRIP</span>
            <div className={styles.gaugeTrack}>
              <div className={styles.gaugeFill} style={{ width: `${gripPct}%` }} />
            </div>
            <span className={styles.gaugeValue}>{sim.grip.toFixed(2)} G</span>
          </div>
        </div>
        <p className={styles.verdict}>ENGINEER: {sim.balance}</p>
      </div>

      <div className={styles.board}>
        <p className={styles.boardTitle}>PIT WALL LEADERBOARD — BEST CONFIGURATIONS</p>
        <div className={styles.submitRow}>
          <input
            className={styles.nameInput}
            value={name}
            maxLength={20}
            placeholder="DRIVER NAME"
            aria-label="Driver name for leaderboard"
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className={styles.submitBtn}
            onClick={submit}
            disabled={submitting || name.trim().length === 0}
          >
            SUBMIT TO PIT WALL
          </button>
        </div>
        <p
          className={`${styles.status} ${
            status.kind === "ok" ? styles.statusOk : status.kind === "err" ? styles.statusErr : ""
          }`}
          role="status"
        >
          {status.msg}
        </p>
        {board && board.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">POS</th>
                <th scope="col">DRIVER</th>
                <th scope="col">LAP</th>
                <th scope="col">SETUP</th>
              </tr>
            </thead>
            <tbody>
              {board.slice(0, 8).map((e, i) => (
                <tr key={`${e.name}-${e.timeMs}-${i}`} className={e.timeMs === myBest ? styles.mine : ""}>
                  <td>P{i + 1}</td>
                  <td>{e.name}</td>
                  <td>{formatLap(e.timeMs)}</td>
                  <td>
                    {e.config.frontWing.toUpperCase()}/{e.config.rearWing.toUpperCase()}·
                    {e.config.powerUnit.charAt(0).toUpperCase()}·
                    {e.config.tires.charAt(0).toUpperCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
