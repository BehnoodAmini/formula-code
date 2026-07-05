"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsapSetup";
import { useStore } from "@/lib/store";
import styles from "./SectionWipe.module.css";

/**
 * The single signature transition motif, reused between every major section:
 * a red streak, a gold streak and a checkered tail sweep across as the
 * boundary scrolls through the viewport (scrubbed, so it runs in reverse on
 * the way back up). Reduced motion turns it into a static skewed divider.
 */
export default function SectionWipe() {
  const root = useRef<HTMLDivElement>(null);
  const reduceMotion = useStore((s) => s.reduceMotion);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll(`.${styles.streak}`),
        { xPercent: -160 },
        {
          xPercent: 380,
          ease: "none",
          stagger: 0.08,
          scrollTrigger: {
            trigger: el,
            start: "top 95%",
            end: "bottom 5%",
            scrub: 0.4,
          },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [reduceMotion]);

  return (
    <div ref={root} className={styles.wipe} aria-hidden="true">
      <div className={styles.streak} />
      <div className={styles.streak} />
      <div className={styles.streak} />
    </div>
  );
}
