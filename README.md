# Formula Code

A scroll-driven, 3D-interactive portfolio for a senior fullstack developer, with a
Ferrari-inspired — but original and IP-safe — visual identity. The centerpiece is an
interactive car-anatomy explorer and a "Build Your Car" lap simulator.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start   # production
```

Demo: [🏎️](https://formula-code.vercel.app/)

Personal details (name, email, links) live in `lib/siteConfig.ts`.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) with the **React Compiler** enabled
  (`reactCompiler: true`) — auto-memoization keeps DOM re-renders away from the r3f frame budget.
- **react-three-fiber 9 + drei 10** for all Three.js work (no raw imperative Three).
- **GSAP + ScrollTrigger** for scroll choreography.
- **CSS Modules** + design tokens as CSS custom properties. No Tailwind.
- **Zustand** for discrete global state.
- **Next Route Handlers** (not Express) for the contact + leaderboard APIs — one deploy
  target, and the lap simulator (`lib/lapSim.ts`) is imported by both the client UI and
  the server route, so lap times are always recomputed server-side from the submitted
  config (no fabricated leaderboard times).
- `proxy.ts` (Next 16's successor to middleware) adds security headers.

## Architecture notes

### GSAP ⇄ r3f scroll sync (`lib/scrollBus.ts`)

One authority, one consumer. ScrollTrigger owns scroll and writes plain numbers into a
mutable module singleton (`scrollBus`); the r3f loop reads them in `useFrame` and eases
toward them. React re-renders are never on the scroll path, and GSAP never touches the
camera — so the two animation systems cannot fight over the same properties.

- continuous values (scroll progress, pointer, explode factor) → `scrollBus`
- discrete state (theme, selected part, game config) → Zustand

### Theme switching in 3D (`three/LightRig.tsx`)

CSS custom properties flip the DOM instantly, but WebGL doesn't read CSS. The light rig
keeps a numeric preset per theme (light intensities/colors, fog, floor color, garage
props) and damps every value toward the active preset each frame — flipping the pit-wall
switch cross-fades the whole 3D environment from night garage to daylight pit lane. The
canvas is transparent and the fog color matches the page background token, so the 2D and
3D worlds always agree.

### The car (`three/CarModel.tsx`)

An original stylized single-seater assembled from primitives. Each anatomy part is a
`PartGroup` that eases toward `base + explodeDir × explode` (exploded view) and pulses
its emissive when hovered/selected. Wing/tire options from the Build game change the
actual meshes (flap angles, extra elements, compound ring markings).

### Performance / resilience

- Both canvases are separate lazy-loaded chunks (`next/dynamic`, `ssr: false`).
- The garage lives in React 19.2 `<Activity>`: scrolled far away it hides (frameloop
  paused) without losing WebGL context or game state.
- `lib/webgl.ts` tiers devices: `high` / `low` (capped DPR) / `none` (static CSS-art
  fallback; the part explorer still works as text).
- Reduced motion: honored from `prefers-reduced-motion` AND an explicit in-app switch —
  intro skipped, camera parked, scrub tweens not created, wipes become static dividers.

### Accessibility

- WCAG AA: raw accent red/gold fail 4.5:1 on some surfaces, so tokens ship AA-safe
  `--accent-*-text` variants for small text (see the audit table in `app/globals.css`).
- Theme + motion switches are `role="switch"`, keyboard operable, with a red/gold
  `:focus-visible` ring globally.
- Every 3D interaction has a DOM equivalent (part chips, explode slider), tire compounds
  are letter + shape + ring-count, never color alone.

## Hero car model

The hero renders `public/models/f1-car.glb` — converted from **"Formula 1 mesh" by
Dil Afroze Ahmad** (free model, attribution required; credited in the footer). The
raw kit lives in `assets-src/formula 1/` (deliberately outside `public/`). Its
diffuse texture replicates Ferrari's sponsor livery, so the build pipeline
(`scripts/prepare-car-assets.mjs`) generates a **de-branded two-tone livery**
(rosso + carbon) that is the default and safe to deploy.

**Livery flavors** (`NEXT_PUBLIC_CAR_LIVERY` in `.env.local`, gitignored):

- unset → de-branded two-tone (deployable)
- `original` → the model's original replica livery, trademarks and all —
  **private/local builds only**. Before deploying anywhere public: remove the
  `.env.local` entry AND delete `public/models/tex/livery-original.webp`.

Re-run after changing the source assets:

```bash
node scripts/prepare-car-assets.mjs
npx gltf-transform weld public/models/f1-car.glb tmp.glb && npx gltf-transform quantize tmp.glb public/models/f1-car.glb
```

The mesh is one merged object, so the garage's exploded anatomy view keeps the
procedural "schematic twin" from `three/CarModel.tsx` (which also serves as the
hero's loading fallback and the low-tier/no-WebGL path).

## Smoke test

`scripts/smoke-drive.mjs` drives the running site with puppeteer-core against your
installed Chrome (skip intro → garage → exploded view → build tab → theme flip →
contact), saves screenshots to the directory you pass, and prints any console errors:

```bash
npm start
node scripts/smoke-drive.mjs ./screenshots
```

## Data

Runtime data is JSON on disk (`server/data/`, gitignored): `leaderboard.json` (seeded
via the simulator on first GET) and `messages.json` (contact form; swap `writeJson` for
nodemailer/Resend to email instead).
