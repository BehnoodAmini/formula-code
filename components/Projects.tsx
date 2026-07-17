"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, cssSel } from "@/lib/gsapSetup";
import { useStore } from "@/lib/store";
import { useSectionSpy } from "@/lib/hooks";
import styles from "./Projects.module.css";

interface Project {
  name: string;
  desc: string;
  stack: string[];
  stats: [string, string][];
  art: "commerce" | "scale" | "waveform" | "uplift";
  link?: string;
  demo?: string;
  ndaNote?: string;
}

const PROJECTS: Project[] = [
  {
    name: "E-Commerce File Store",
    desc: "Full-stack marketplace for buying and selling digital files — a Next.js/Tailwind storefront backed by an Express API, a MongoDB catalog, and JWT-based token authentication end to end.",
    stack: ["Next.js 15", "React", "Tailwind CSS", "Node.js", "Express.js", "MongoDB", "JWT"],
    stats: [
      ["FRONTEND", "Next.js 15"],
      ["AUTH", "JWT"],
      ["DATABASE", "MongoDB"],
    ],
    art: "commerce",
    link: "https://github.com/BehnoodAmini/full-stack_E-Commerce-File-Shop",
  },
  {
    name: "Causal Retention Uplift",
    desc: "Measures whether a marketing e-mail actually causes customers to return — not just who will churn. A Python/EconML pipeline estimates per-customer treatment effects (CATE) on 64K customers from a real randomized experiment, distilled to ONNX and served by a static Next.js explorer with a segment breakdown and targeting-policy simulator.",
    stack: ["Next.js 16", "Python", "EconML", "SHAP", "ONNX", "Recharts"],
    stats: [
      ["EFFECT", "+6.0pp lift"],
      ["MODEL", "X-learner CATE"],
      ["SAMPLE", "64K customers"],
    ],
    art: "uplift",
    link: "https://github.com/BehnoodAmini/causal-retention-uplift",
    demo: "https://causal-retention-uplift.vercel.app/",
  },
  {
    name: "Medu-Council",
    desc: "Nationwide platform coordinating every education council across Iran for the Ministry of Education, architected for a projected 17-million-user base with SSO-gated access and a PostgreSQL data layer.",
    stack: ["React 18", "Tailwind CSS", "Node.js", "Express.js", "PostgreSQL", "SSO"],
    stats: [
      ["SCALE", "17M users"],
      ["AUTH", "SSO"],
      ["DATABASE", "PostgreSQL"],
    ],
    art: "scale",
    ndaNote: "Private repo — built under NDA for Iran's Ministry of Education.",
  },
  {
    name: "Ava",
    desc: "Converts audio, video and media links into text. A React frontend submits jobs over a REST API while a WebSocket channel streams conversion progress back live.",
    stack: ["React", "REST API", "WebSocket"],
    stats: [
      ["INPUT", "Audio · Video · Link"],
      ["OUTPUT", "Text"],
      ["TRANSPORT", "WebSocket"],
    ],
    art: "waveform",
    link: "https://github.com/BehnoodAmini/ava",
  },
];

/** Inline schematic art per project — no external images, tokens only. */
function Art({ kind }: { kind: Project["art"] }) {
  const stroke = "var(--accent-primary)";
  const gold = "var(--accent-secondary)";
  const dim = "var(--border-subtle)";
  if (kind === "scale") {
    const nodes = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      return { x: 160 + Math.cos(angle) * 108, y: 80 + Math.sin(angle) * 52 };
    });
    return (
      <svg viewBox="0 0 320 160" aria-hidden="true">
        {nodes.map((n, i) => (
          <line key={i} x1="160" y1="80" x2={n.x} y2={n.y} stroke={dim} strokeWidth="1" />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r="5" fill="none" stroke={i % 3 === 0 ? gold : dim} strokeWidth="1.4" />
        ))}
        <circle cx="160" cy="80" r="14" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="160" y="84" fontSize="10" fill={stroke} fontFamily="var(--font-mono)" textAnchor="middle">
          SSO
        </text>
        <text x="160" y="146" fontSize="10" fill="var(--text-secondary)" fontFamily="var(--font-mono)" textAnchor="middle">
          17M USERS · NATIONWIDE
        </text>
      </svg>
    );
  }
  if (kind === "commerce") {
    return (
      <svg viewBox="0 0 320 160" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={24 + i * 100}
            y="34"
            width="72"
            height="92"
            rx="4"
            fill="none"
            stroke={i === 1 ? stroke : dim}
            strokeWidth={i === 1 ? 2 : 1}
          />
        ))}
        <rect x="136" y="46" width="48" height="34" rx="2" fill={dim} />
        <line x1="136" y1="96" x2="184" y2="96" stroke={gold} strokeWidth="2" />
        <line x1="136" y1="106" x2="170" y2="106" stroke={dim} strokeWidth="2" />
        <circle cx="160" cy="140" r="3" fill={gold} />
        <text x="30" y="24" fontSize="10" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
          MONGODB CATALOG · JWT AUTH
        </text>
      </svg>
    );
  }
  if (kind === "uplift") {
    // Qini/uplift curve (targeting model vs. random baseline)
    const qini = "M32 118 C 96 96, 168 66, 232 50 S 296 44, 296 44";
    return (
      <svg viewBox="0 0 320 160" aria-hidden="true">
        {/* effect ruler: baseline → treated, with a confidence band */}
        <line x1="32" y1="132" x2="296" y2="132" stroke={dim} strokeWidth="1" />
        <rect x="196" y="124" width="40" height="16" rx="2" fill={gold} opacity="0.18" />
        <circle cx="120" cy="132" r="4" fill="none" stroke={dim} strokeWidth="1.4" />
        <circle cx="216" cy="132" r="4" fill={stroke} />
        <line x1="124" y1="132" x2="208" y2="132" stroke={gold} strokeWidth="2" strokeDasharray="5 4" />
        <polygon points="208,127 220,132 208,137" fill={gold} />
        <text x="120" y="150" fontSize="8" fill="var(--text-secondary)" fontFamily="var(--font-mono)" textAnchor="middle">
          10.6%
        </text>
        <text x="216" y="150" fontSize="8" fill={stroke} fontFamily="var(--font-mono)" textAnchor="middle">
          +6.0pp
        </text>
        {/* targeting curve above the ruler */}
        <line x1="32" y1="118" x2="296" y2="118" stroke={dim} strokeWidth="1" opacity="0.5" />
        <line x1="32" y1="118" x2="296" y2="44" stroke={dim} strokeWidth="1" strokeDasharray="3 4" />
        <path d={qini} fill="none" stroke={stroke} strokeWidth="2" />
        <circle cx="296" cy="44" r="3" fill={gold} />
        <text x="32" y="24" fontSize="10" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
          CATE UPLIFT · QINI-RANKED
        </text>
      </svg>
    );
  }
  const bars = [8, 20, 34, 46, 30, 52, 24, 40, 16, 36, 12, 44, 22, 30, 10];
  return (
    <svg viewBox="0 0 320 160" aria-hidden="true">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={16 + i * 12}
          y={80 - h / 2}
          width="6"
          height={h}
          rx="2"
          fill={i % 4 === 0 ? gold : stroke}
        />
      ))}
      <line x1="204" y1="80" x2="244" y2="80" stroke={gold} strokeWidth="2" strokeDasharray="6 4" />
      <polygon points="244,74 256,80 244,86" fill={gold} />
      {[0, 1, 2].map((i) => (
        <line key={i} x1="262" y1={62 + i * 18} x2={i === 1 ? 300 : 294} y2={62 + i * 18} stroke={dim} strokeWidth="2" />
      ))}
      <text x="16" y="24" fontSize="10" fill="var(--text-secondary)" fontFamily="var(--font-mono)">
        AUDIO/VIDEO → TEXT · WS STREAM
      </text>
    </svg>
  );
}

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function Projects() {
  const section = useRef<HTMLElement>(null);
  const reduceMotion = useStore((s) => s.reduceMotion);
  useSectionSpy("projects", section);

  useLayoutEffect(() => {
    const el = section.current;
    if (!el || reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(cssSel(styles.card)).forEach((card) => {
        gsap.from(card, {
          y: 60,
          autoAlpha: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: card, start: "top 78%" },
        });
        // subtle depth: media pane drifts against the card while in view
        gsap.fromTo(
          card.querySelector(cssSel(styles.media)),
          { yPercent: 6 },
          {
            yPercent: -6,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: 0.5 },
          },
        );
      });
    }, el);
    return () => ctx.revert();
  }, [reduceMotion]);

  return (
    <section id="projects" ref={section} className={styles.section} aria-label="Projects">
      <div className={styles.inner}>
        <p className="eyebrow">SECTION 03 — RACE HISTORY</p>
        <h2 className="sectionTitle">Selected Projects</h2>

        <div className={styles.list}>
          {PROJECTS.map((p, i) => (
            <article key={p.name} className={styles.card}>
              <div className={styles.media}>
                <Art kind={p.art} />
              </div>
              <div>
                <p className={styles.index}>PROJ {String(i + 1).padStart(2, "0")}</p>
                <h3 className={styles.title}>{p.name}</h3>
                <p className={styles.desc}>{p.desc}</p>
                <div className={styles.stack}>
                  {p.stack.map((s) => (
                    <span key={s} className={styles.chip}>
                      {s}
                    </span>
                  ))}
                </div>
                <dl className={styles.readouts}>
                  {p.stats.map(([label, value]) => (
                    <div key={label} className={styles.readout}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className={styles.footer}>
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      className={`${styles.linkBtn} glowable`}
                    >
                      <GithubMark />
                      VIEW REPO ↗
                    </a>
                  )}
                  {p.demo && (
                    <a
                      href={p.demo}
                      target="_blank"
                      rel="noreferrer"
                      className={`${styles.linkBtn} glowable`}
                    >
                      LIVE DEMO ↗
                    </a>
                  )}
                  {!p.link && p.ndaNote && <span className={styles.nda}>{p.ndaNote}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
