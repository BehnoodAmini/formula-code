"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { gsap, ScrollTrigger } from "@/lib/gsapSetup";
import { scrollBus } from "@/lib/scrollBus";
import { useStore } from "@/lib/store";
import { useSectionSpy, useNearViewport } from "@/lib/hooks";
import { SITE } from "@/lib/siteConfig";
import IntroOverlay from "@/components/IntroOverlay";
import styles from "./Hero.module.css";

// Client-only: a WebGL canvas has no SSR story. Code-splits three.js away
// from the initial bundle.
const HeroScene = dynamic(() => import("@/three/HeroScene"), { ssr: false });

/** Stylized car silhouette for the no-WebGL fallback — same design language. */
function FallbackCar() {
  return (
    <svg viewBox="0 0 640 160" className={styles.fallbackCar} aria-hidden="true">
      <ellipse cx="320" cy="140" rx="290" ry="10" fill="rgba(0,0,0,0.35)" />
      <path d="M40 118 L120 112 L210 84 Q250 70 320 68 L430 68 Q470 68 520 90 L600 104 L600 118 Z" fill="#c9160c" />
      <path d="M20 96 L70 96 L78 118 L28 118 Z" fill="#1b1b20" />
      <path d="M560 62 L616 62 L616 70 L560 70 Z M566 70 L572 100 L606 100 L612 70 Z" fill="#1b1b20" />
      <circle cx="150" cy="118" r="30" fill="#131315" />
      <circle cx="150" cy="118" r="12" fill="#d4af37" />
      <circle cx="480" cy="118" r="30" fill="#131315" />
      <circle cx="480" cy="118" r="12" fill="#d4af37" />
      <path d="M300 66 Q320 46 350 66 Z" fill="#d4af37" />
    </svg>
  );
}

export default function Hero() {
  const section = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const glTier = useStore((s) => s.glTier);
  const reduceMotion = useStore((s) => s.reduceMotion);
  useSectionSpy("hero", section);
  // the scene fully unmounts (context destroyed, VRAM freed) when far away —
  // only one live WebGL context exists at a time site-wide
  const near = useNearViewport(section, "300px");

  // WRITER side of the GSAP<->r3f bridge: ScrollTrigger owns scroll, and its
  // only job here is publishing progress to the bus. The camera consumes it
  // in useFrame. One authority, one consumer, zero competing tweens.
  useLayoutEffect(() => {
    const el = section.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          scrollBus.hero = self.progress;
        },
      });

      if (!reduceMotion) {
        // DOM choreography stays in GSAP-land: fade/lift the headline as the
        // camera pulls away, retire the scroll cue almost immediately.
        gsap.to(content.current, {
          yPercent: -30,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "45% top", scrub: true },
        });
        gsap.to(cue.current, {
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "12% top", scrub: true },
        });
      }
    }, el);
    return () => ctx.revert();
  }, [reduceMotion]);

  // pointer parallax feed (continuous -> bus, never state)
  useEffect(() => {
    if (reduceMotion) {
      scrollBus.pointerX = 0;
      scrollBus.pointerY = 0;
      return;
    }
    const onMove = (e: PointerEvent) => {
      scrollBus.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      scrollBus.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduceMotion]);

  const webgl = glTier === "high" || glTier === "low";

  return (
    <section ref={section} className={styles.section} aria-label="Intro">
      <IntroOverlay />
      <div className={styles.stage}>
        <div className={styles.canvasWrap} aria-hidden="true">
          {webgl ? (
            near ? (
              <HeroScene active={near} />
            ) : null
          ) : (
            <div className={styles.fallbackScene}>
              <FallbackCar />
            </div>
          )}
        </div>

        <div ref={content} className={styles.content}>
          <p className={styles.kicker}>{SITE.role}</p>
          <h1 className={styles.name}>
            {SITE.name.split(" ")[0]} <em>{SITE.name.split(" ").slice(1).join(" ")}</em>
          </h1>
          <p className={styles.role}>{SITE.tagline}</p>

          <dl className={styles.statStrip}>
            <div className={styles.stat}>
              <dt>SEASONS</dt>
              <dd>
                {String(SITE.yearsExperience).padStart(2, "0")}
                <i>+</i>
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>STACK DEPTH</dt>
              <dd>
                FULL<i>×</i>
              </dd>
            </div>
            <div className={styles.stat}>
              <dt>DEPLOYS</dt>
              <dd>
                10<i>+</i>
              </dd>
            </div>
          </dl>
        </div>

        <div ref={cue} className={styles.scrollCue} aria-hidden="true">
          SCROLL
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4l5 6 5-6" stroke="var(--accent-primary)" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </section>
  );
}
