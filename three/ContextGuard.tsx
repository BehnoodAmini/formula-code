"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";

/**
 * WebGL contexts get killed by the browser/driver (GPU memory pressure,
 * driver resets, GPU-process crashes). Recovery ladder:
 *
 *  1. context lost  -> remount the <Canvas> after a backoff (0.6s / 1.6s / 4s)
 *     — Chrome throttles context creation right after a GPU crash, so
 *     immediate remounts can fail; the backoff rides out the cooldown.
 *  2. creation throws synchronously -> <CanvasBoundary> catches it so the
 *     whole React tree can't unmount into a blank page.
 *  3. still dying after 3 strikes -> a manual "RESTART 3D" panel. Never a
 *     dead sad-face canvas, never a forced page reload.
 *
 * A context that survives 30s earns its strikes back.
 */

const BACKOFF_MS = [600, 1600, 4000];
const MAX_STRIKES = 3;

export function useCanvasRecovery() {
  const [canvasKey, setCanvasKey] = useState(0);
  const [failed, setFailed] = useState(false);
  const strikes = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      strikes.current = 0;
    }, 30_000);
    timers.current.push(t);
    const pending = timers.current;
    return () => pending.forEach((id) => clearTimeout(id));
  }, [canvasKey]);

  const onContextLost = useCallback(() => {
    strikes.current += 1;
    if (strikes.current > MAX_STRIKES) {
      setFailed(true);
      return;
    }
    const delay =
      BACKOFF_MS[Math.min(strikes.current - 1, BACKOFF_MS.length - 1)];
    const t = window.setTimeout(() => setCanvasKey((k) => k + 1), delay);
    timers.current.push(t);
  }, []);

  const restart = useCallback(() => {
    strikes.current = 0;
    setFailed(false);
    setCanvasKey((k) => k + 1);
  }, []);

  return { canvasKey, onContextLost, failed, restart };
}

export default function ContextGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const handler = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    el.addEventListener("webglcontextlost", handler);
    return () => el.removeEventListener("webglcontextlost", handler);
  }, [gl, onLost]);

  return null;
}

export function RestartPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
        <span
          className="mono"
          style={{
            fontSize: "0.68rem",
            letterSpacing: "0.28em",
            color: "var(--text-secondary)",
          }}
        >
          3D RENDERER STALLED
        </span>
        <button
          type="button"
          className="mono glowable"
          onClick={onRetry}
          style={{
            border: "1px solid var(--accent-primary)",
            borderRadius: "var(--radius-1)",
            padding: "9px 18px",
            fontSize: "0.68rem",
            letterSpacing: "0.16em",
            color: "var(--text-primary)",
            background: "transparent",
          }}
        >
          ⟲ RESTART 3D
        </button>
      </div>
    </div>
  );
}

interface BoundaryProps {
  resetKey: number;
  onRetry: () => void;
  children: React.ReactNode;
}
interface BoundaryState {
  error: boolean;
  lastKey: number;
}

/** catches synchronous WebGL-creation failures inside <Canvas> */
export class CanvasBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: false, lastKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { error: true };
  }

  static getDerivedStateFromProps(
    props: BoundaryProps,
    state: BoundaryState,
  ): Partial<BoundaryState> | null {
    if (props.resetKey !== state.lastKey) {
      return { error: false, lastKey: props.resetKey };
    }
    return null;
  }

  render() {
    if (this.state.error) return <RestartPanel onRetry={this.props.onRetry} />;
    return this.props.children;
  }
}
