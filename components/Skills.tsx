"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, cssSel } from "@/lib/gsapSetup";
import { useStore } from "@/lib/store";
import { useSectionSpy } from "@/lib/hooks";
import { SITE } from "@/lib/siteConfig";
import styles from "./Skills.module.css";

const SEGMENTS = 12;

const SECTORS: { title: string; skills: [string, number][] }[] = [
  {
    title: "Frontend",
    skills: [
      ["TypeScript / React / Next.js", 9.4],
      ["Three.js / WebGL / r3f", 8.6],
      ["CSS architecture & design systems", 9.0],
      ["Accessibility (WCAG)", 8.4],
    ],
  },
  {
    title: "Backend",
    skills: [
      ["Node.js / Express ", 9.2],
      ["REST API design", 8.8],
      ["Auth, sessions, security", 8.5],
      ["Realtime (WebSocket, SSE)", 8.2],
    ],
  },
  {
    title: "Databases",
    skills: [
      ["PostgreSQL", 8.9],
      ["Redis", 6.3],
      ["Sequelize / edge data", 8.0],
      ["MongoDB / mongoose / query tuning", 8.4],
    ],
  },
  {
    title: "Tooling & Ops",
    skills: [
      [" CI-CD pipelines", 8.7],
      ["Testing (Vitest, Playwright)", 8.8],
      ["Performance profiling", 8.9],
      ["Observability & tracing", 8.1],
    ],
  },
];

export default function Skills() {
  const section = useRef<HTMLElement>(null);
  const reduceMotion = useStore((s) => s.reduceMotion);
  useSectionSpy("skills", section);

  useLayoutEffect(() => {
    const el = section.current;
    if (!el || reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap.from(cssSel(styles.panel), {
        y: 42,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 70%" },
      });
      // telemetry bars light up segment by segment
      gsap.from(`${cssSel(styles.segOn)}, ${cssSel(styles.segPeak)}`, {
        scaleX: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: { each: 0.008, from: "start" },
        scrollTrigger: { trigger: el, start: "top 55%" },
      });
    }, el);
    return () => ctx.revert();
  }, [reduceMotion]);

  return (
    <section id="skills" ref={section} className={styles.section} aria-label="Skills">
      <div className={styles.inner}>
        <p className="eyebrow">SECTION 02 — TELEMETRY</p>
        <h2 className="sectionTitle">Systems Check</h2>
        <p className={styles.intro}>
          {SITE.yearsExperience}+ seasons of shipping production software across the whole
          stack — from schema design and queue tuning to shader-level frontend polish.
          Every system below is race-tested: numbers are self-assessed pace, not vanity.
        </p>

        <div className={styles.grid}>
          {SECTORS.map((sector, si) => (
            <div key={sector.title} className={styles.panel}>
              <div className={styles.panelHead}>
                <h3 className={styles.panelTitle}>{sector.title}</h3>
                <span className={styles.sector}>SECTOR {String(si + 1).padStart(2, "0")}</span>
              </div>
              {sector.skills.map(([name, value]) => {
                const filled = Math.round((value / 10) * SEGMENTS);
                return (
                  <div key={name} className={styles.row}>
                    <span className={styles.skillName}>{name}</span>
                    <span className={styles.value}>{value.toFixed(1)}</span>
                    <div
                      className={styles.bar}
                      role="img"
                      aria-label={`${name}: ${value.toFixed(1)} out of 10`}
                    >
                      {Array.from({ length: SEGMENTS }, (_, i) => (
                        <span
                          key={i}
                          className={`${styles.seg} ${
                            i < filled
                              ? value >= 9 && i >= SEGMENTS - 2
                                ? styles.segPeak
                                : styles.segOn
                              : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <p className={styles.systems} aria-label="All systems operational">
          <span>
            ERS <b>CHARGED</b>
          </span>
          <span>
            HYDRAULICS <b>OK</b>
          </span>
          <span>
            GEARBOX <b>OK</b>
          </span>
          <span>
            RADIO <b>OPEN</b>
          </span>
          <span>
            STATUS <b>READY TO DEPLOY</b>
          </span>
        </p>
      </div>
    </section>
  );
}
