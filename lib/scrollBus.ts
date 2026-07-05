/**
 * The single bridge between the two animation systems.
 *
 * GSAP/ScrollTrigger is the only authority on scroll: its onUpdate callbacks
 * WRITE plain numbers here. The r3f render loop (useFrame) READS them every
 * frame and eases toward them. Nothing in here is reactive on purpose —
 * writing 60x/second into React state (or even Zustand) would trigger
 * re-renders and put React reconciliation on the frame budget. A mutable
 * module singleton costs nothing to read inside useFrame.
 *
 * Rule of thumb used across the app:
 *  - continuous values (scroll progress, pointer, explode factor) -> scrollBus
 *  - discrete state (theme, selected part, game config)           -> Zustand
 */
export const scrollBus = {
  /** 0..1 progress across the hero's scroll runway (drives the camera orbit) */
  hero: 0,
  /** 0..1 progress of the engine-start intro timeline (drives the intro dolly) */
  intro: 0,
  /** normalized pointer, -1..1 (parallax on the hero camera) */
  pointerX: 0,
  pointerY: 0,
  /** 0..1 explode factor for the anatomy scene (slider / part selection) */
  explode: 0,
};
