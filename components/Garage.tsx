"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { useSectionSpy, useNearViewport } from "@/lib/hooks";
import { PARTS, PART_BY_ID } from "@/lib/carParts";
import ActivityGate from "@/components/ActivityGate";
import BuildGame from "@/components/BuildGame";
import styles from "./Garage.module.css";

const AnatomyScene = dynamic(() => import("@/three/AnatomyScene"), {
  ssr: false,
  loading: () => (
    <div className={styles.stageLoading}>
      <span className={styles.pulse}>SPOOLING TURBO…</span>
    </div>
  ),
});

/**
 * The flagship mini-app. The 3D stage lazy-mounts the first time it comes
 * near the viewport, then lives inside <Activity> so scrolling away hides it
 * (pausing its frameloop) without losing the WebGL context, camera pose,
 * selected part or game state.
 */
export default function Garage() {
  const section = useRef<HTMLElement>(null);
  useSectionSpy("garage", section);
  // the scene mounts only while near: its WebGL context is destroyed (VRAM
  // freed) when you navigate away, so it never coexists with the hero's
  const near = useNearViewport(section, "700px");

  const glTier = useStore((s) => s.glTier);
  const garageMode = useStore((s) => s.garageMode);
  const setGarageMode = useStore((s) => s.setGarageMode);
  const selectedPart = useStore((s) => s.selectedPart);
  const selectPart = useStore((s) => s.selectPart);
  const explodeAmount = useStore((s) => s.explodeAmount);
  const setExplodeAmount = useStore((s) => s.setExplodeAmount);
  const drsOpen = useStore((s) => s.drsOpen);
  const toggleDrs = useStore((s) => s.toggleDrs);

  const webgl = glTier === "high" || glTier === "low";
  const info = selectedPart ? PART_BY_ID[selectedPart] : null;

  return (
    <section id="garage" ref={section} className={styles.section} aria-label="Car anatomy explorer">
      <div className={styles.inner}>
        <p className="eyebrow">SECTION 04 — THE GARAGE</p>
        <h2 className="sectionTitle">Car Anatomy</h2>
        <p className={styles.lede}>
          Every fast lap is a systems argument won in the details — same as software.
          Orbit the car, click a part (or use the list) to blow it apart and read why it
          exists. Then switch to <strong>BUILD</strong> and argue with the lap simulator.
        </p>

        <ActivityGate active={near}>
          <div className={styles.layout}>
            {/* ------------------------------ 3D stage ------------------------------ */}
            <div className={styles.stage}>
              <div className={styles.canvasHost} aria-hidden={webgl || undefined}>
                {webgl && near ? (
                  <AnatomyScene active={near} />
                ) : webgl ? (
                  <div className={styles.stageLoading}>
                    <span>APPROACHING GARAGE…</span>
                  </div>
                ) : (
                  <div className={styles.stageLoading}>
                    <span>
                      3D UNAVAILABLE ON THIS DEVICE — THE PART LIST STILL WORKS
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.stageBar}>
                <label className={styles.explodeControl}>
                  EXPLODE
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(explodeAmount * 100)}
                    onChange={(e) => setExplodeAmount(Number(e.target.value) / 100)}
                    aria-label="Exploded view amount"
                  />
                  <span className="mono">{Math.round(explodeAmount * 100)}%</span>
                </label>
                <span className={styles.hint}>DRAG TO ORBIT · CLICK A PART</span>
              </div>
            </div>

            {/* ------------------------------- panel -------------------------------- */}
            <div className={styles.panel}>
              <div className={styles.tabs} role="tablist" aria-label="Garage mode">
                <button
                  role="tab"
                  aria-selected={garageMode === "inspect"}
                  className={`${styles.tab} ${garageMode === "inspect" ? styles.tabActive : ""}`}
                  onClick={() => setGarageMode("inspect")}
                >
                  INSPECT
                </button>
                <button
                  role="tab"
                  aria-selected={garageMode === "build"}
                  className={`${styles.tab} ${garageMode === "build" ? styles.tabActive : ""}`}
                  onClick={() => setGarageMode("build")}
                >
                  BUILD
                </button>
              </div>

              <div className={styles.panelBody}>
                {garageMode === "inspect" ? (
                  <>
                    <div className={styles.chips} role="group" aria-label="Car parts">
                      {PARTS.map((p) => (
                        <button
                          key={p.id}
                          className={`${styles.chip} ${selectedPart === p.id ? styles.chipActive : ""}`}
                          aria-pressed={selectedPart === p.id}
                          onClick={() => selectPart(selectedPart === p.id ? null : p.id)}
                        >
                          <small>{p.code}</small>
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>

                    {info ? (
                      <div className={styles.callout} aria-live="polite">
                        <p className={styles.calloutCode}>{info.code} — SCHEMATIC</p>
                        <h3 className={styles.calloutName}>{info.name}</h3>
                        <p className={styles.calloutTagline}>{info.tagline}</p>
                        <p className={styles.calloutBody}>{info.purpose}</p>
                        <dl className={styles.calloutStats}>
                          {info.stats.map((s) => (
                            <div key={s.label} className={styles.calloutStat}>
                              <dt>{s.label}</dt>
                              <dd>{s.value}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className={styles.actionRow}>
                          {info.id === "rearWing" && (
                            <button
                              className={`${styles.actionBtn} ${drsOpen ? styles.actionBtnActive : ""}`}
                              aria-pressed={drsOpen}
                              onClick={toggleDrs}
                            >
                              DRS {drsOpen ? "OPEN ▲" : "CLOSED ▼"}
                            </button>
                          )}
                          <button
                            className={styles.actionBtn}
                            onClick={() => {
                              selectPart(null);
                              setExplodeAmount(0);
                            }}
                          >
                            ⟲ ASSEMBLE
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={styles.calloutEmpty}>
                        Select a component to open its schematic — front wing, floor,
                        suspension, brakes, tires, power unit or rear wing.
                      </p>
                    )}
                  </>
                ) : (
                  <BuildGame active={near} />
                )}
              </div>
            </div>
          </div>
        </ActivityGate>
      </div>
    </section>
  );
}
