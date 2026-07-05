"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import styles from "./CursorFollower.module.css";

/**
 * Telemetry reticle cursor follower: a damped ring lazily chases the pointer
 * while a small dot stays snappy on it. Goes gold over interactive elements,
 * compresses on click. Purely decorative — the native cursor stays visible,
 * mouse-only (touch/pen ignored), and it renders nothing under reduced
 * motion. Transforms are written directly in a rAF loop (no React state per
 * move) and the loop parks itself once the ring converges.
 */

const INTERACTIVE =
  'a, button, input, textarea, select, label, [role="switch"], [role="radio"], [role="tab"]';

export default function CursorFollower() {
  const reduceMotion = useStore((s) => s.reduceMotion);
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const r = ring.current;
    const d = dot.current;
    if (!r || !d) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let dx = mx;
    let dy = my;
    let raf = 0;
    let running = false;
    let shown = false;

    const apply = () => {
      d.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      r.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    };

    const loop = () => {
      dx += (mx - dx) * 0.55;
      dy += (my - dy) * 0.55;
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      apply();
      if (Math.hypot(mx - rx, my - ry) > 0.15) {
        raf = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    const kick = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX;
      my = e.clientY;
      if (!shown) {
        shown = true;
        // first sighting: snap into place instead of flying across the screen
        rx = dx = mx;
        ry = dy = my;
        apply();
        r.classList.add(styles.visible);
        d.classList.add(styles.visible);
      }
      kick();
    };

    const onOver = (e: PointerEvent) => {
      const hit = (e.target as Element | null)?.closest?.(INTERACTIVE);
      r.classList.toggle(styles.hot, !!hit);
    };

    const onLeave = () => {
      shown = false;
      r.classList.remove(styles.visible);
      d.classList.remove(styles.visible);
    };

    const onDown = () => r.classList.add(styles.press);
    const onUp = () => r.classList.remove(styles.press);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div className={styles.layer} aria-hidden="true">
      <div ref={ring} className={styles.ring}>
        {/* targeting reticle: ring + four ticks */}
        <svg viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="13" stroke="currentColor" strokeWidth="1.4" opacity="0.85" />
          <line x1="22" y1="2" x2="22" y2="8" stroke="currentColor" strokeWidth="1.6" />
          <line x1="22" y1="36" x2="22" y2="42" stroke="currentColor" strokeWidth="1.6" />
          <line x1="2" y1="22" x2="8" y2="22" stroke="currentColor" strokeWidth="1.6" />
          <line x1="36" y1="22" x2="42" y2="22" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </div>
      <div ref={dot} className={styles.dot} />
    </div>
  );
}
