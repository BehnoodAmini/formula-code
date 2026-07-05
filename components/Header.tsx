"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { SectionId } from "@/lib/store";
import styles from "./Header.module.css";

const NAV: { id: SectionId; label: string; href: string }[] = [
  { id: "skills", label: "TELEMETRY", href: "#skills" },
  { id: "projects", label: "PROJECTS", href: "#projects" },
  { id: "garage", label: "GARAGE", href: "#garage" },
  { id: "contact", label: "CONTACT", href: "#contact" },
];

export default function Header() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const reduceMotion = useStore((s) => s.reduceMotion);
  const setReduceMotion = useStore((s) => s.setReduceMotion);
  const activeSection = useStore((s) => s.activeSection);

  // switches render their persisted state only after mount to avoid a
  // hydration mismatch (SSR can't know localStorage)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDay = mounted && theme === "pit-lane";
  const isReduced = mounted && reduceMotion;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="#main" className={styles.logo} aria-label="Formula Code — back to top">
          <svg viewBox="0 0 64 64" className={styles.logoMark} aria-hidden="true">
            <path d="M14 44 L30 20 H40 L24 44 Z" fill="var(--accent-primary)" />
            <path d="M30 44 L46 20 H52 L36 44 Z" fill="var(--accent-secondary)" />
            <rect x="12" y="47" width="40" height="3" fill="currentColor" opacity="0.6" />
          </svg>
          Formula<em>Code</em>
        </a>

        <nav className={styles.nav} aria-label="Sections">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={styles.navLink}
              aria-current={activeSection === item.id || undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.controls}>
          <div className={styles.switchGroup}>
            <span className={styles.switchLabel} id="theme-switch-label">
              {isDay ? "PIT LANE DAY" : "RACE NIGHT"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isDay}
              aria-labelledby="theme-switch-label"
              className={styles.switch}
              onClick={() => setTheme(isDay ? "race-night" : "pit-lane")}
            >
              <span className={styles.knob}>
                <span className={styles.led} />
              </span>
            </button>
          </div>

          <div className={styles.switchGroup}>
            <span className={styles.switchLabel} id="motion-switch-label">
              REDUCE MOTION
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isReduced}
              aria-labelledby="motion-switch-label"
              className={styles.switch}
              onClick={() => setReduceMotion(!reduceMotion, true)}
            >
              <span className={styles.knob}>
                <span className={styles.led} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
