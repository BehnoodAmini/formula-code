"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsapSetup";
import { scrollBus } from "@/lib/scrollBus";
import { useStore } from "@/lib/store";
import styles from "./IntroOverlay.module.css";

/**
 * "Engine start": five start-lights come on one by one, hold, then lights
 * out — overlay lifts while the camera (reading scrollBus.intro) dollies
 * into the hero pose. Skippable; auto-skipped for reduced motion and on
 * repeat visits within the same session.
 */
export default function IntroOverlay() {
  const finishIntro = useStore((s) => s.finishIntro);
  const introDone = useStore((s) => s.introDone);
  const overlay = useRef<HTMLDivElement>(null);
  const lights = useRef<(HTMLSpanElement | null)[]>([]);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const seen = (() => {
      try {
        return sessionStorage.getItem("fc-intro") === "done";
      } catch {
        return false;
      }
    })();
    const reduce = document.documentElement.dataset.motion === "reduce";

    const done = () => {
      scrollBus.intro = 1;
      try {
        sessionStorage.setItem("fc-intro", "done");
      } catch {}
      document.body.removeAttribute("data-scroll-lock");
      finishIntro();
    };

    if (seen || reduce) {
      done();
      setSkipped(true);
      return;
    }

    document.body.dataset.scrollLock = "true";
    const els = lights.current.filter(Boolean);
    const tl = gsap.timeline({
      onUpdate: () => {
        scrollBus.intro = tl.progress();
      },
      onComplete: done,
    });

    tl.to({}, { duration: 0.35 });
    els.forEach((el, i) => {
      tl.to(el, { duration: 0.01, onStart: () => el?.classList.add(styles.lightOn) }, 0.35 + i * 0.42);
    });
    tl.to({}, { duration: 0.7 }); // ...hold...
    tl.add(() => els.forEach((el) => el?.classList.remove(styles.lightOn))); // lights out
    tl.to(overlay.current, { autoAlpha: 0, duration: 0.9, ease: "power2.inOut" }, "+=0.15");

    return () => {
      tl.kill();
      document.body.removeAttribute("data-scroll-lock");
    };
  }, [finishIntro]);

  if (introDone && skipped) return null;
  if (introDone) return null;

  return (
    <div ref={overlay} className={styles.overlay} role="dialog" aria-label="Intro animation">
      <div className={styles.stack}>
        <p className={styles.title}>Formula Code — Ignition</p>
        <div className={styles.gantry} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={styles.light}
              ref={(el) => {
                lights.current[i] = el;
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className={styles.skip}
          onClick={() => {
            scrollBus.intro = 1;
            try {
              sessionStorage.setItem("fc-intro", "done");
            } catch {}
            document.body.removeAttribute("data-scroll-lock");
            useStore.getState().finishIntro();
          }}
          autoFocus
        >
          SKIP INTRO →
        </button>
      </div>
    </div>
  );
}
