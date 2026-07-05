/**
 * One-shot asset pipeline for the hero car model
 * ("Formula 1 mesh" by Dil Afroze Ahmad — free model, attribution required).
 *
 * 1. OBJ -> GLB (geometry + material slot names; broken texture refs stripped)
 * 2. De-branded livery: the original diffuse is a replica Ferrari sponsor
 *    livery (trademarked logos). We downscale it hard so text/logos dissolve,
 *    then classify every pixel to the site's palette (red/carbon/white/gold).
 *    Color-blocking survives; no readable marks remain.
 * 3. Roughness map: inverted Substance glossiness, resized.
 * 4. Normal map: resized/compressed.
 *
 * Run: node scripts/prepare-car-assets.mjs
 * Outputs: public/models/f1-car.glb + public/models/tex/*.webp|png
 */
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import obj2gltf from "obj2gltf";
import sharp from "sharp";

const ROOT = path.resolve(process.cwd());
// raw model kit lives OUTSIDE public/ so the trademarked source textures
// never ship on a deploy; only the generated GLB + maps are served
const SRC = path.join(ROOT, "assets-src", "formula 1");
const TEX_SRC = path.join(SRC, "Substance SpecGloss", "Right ones");
const OUT_MODELS = path.join(ROOT, "public", "models");
const OUT_TEX = path.join(OUT_MODELS, "tex");

// strict two-tone "launch livery": solid rosso bodywork + carbon/rubber.
// More classes (white/gold) produce blotchy camouflage once logos melt,
// so anything bright classifies to red and anything dark to carbon.
const PALETTE = [
  { name: "red", rgb: [165, 16, 9] },
  { name: "carbon", rgb: [22, 22, 27] },
];

async function convertGeometry() {
  // work on copies so the artist's originals stay untouched;
  // strip map_* lines from the MTL (absolute paths from the author's PC)
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "fc-car-"));
  const objCopy = path.join(tmp, "car.obj");
  const mtlCopy = path.join(tmp, "Formula_1_mesh.mtl");

  let obj = await fs.readFile(path.join(SRC, "Formula 1 mesh.obj"), "utf8");
  obj = obj.replace(/^mtllib .*$/m, "mtllib ./Formula_1_mesh.mtl");
  await fs.writeFile(objCopy, obj);

  let mtl = await fs.readFile(path.join(SRC, "Formula_1_mesh.mtl"), "utf8");
  mtl = mtl
    .split("\n")
    .filter((l) => !/^\s*map_/i.test(l))
    .join("\n");
  await fs.writeFile(mtlCopy, mtl);

  const glb = await obj2gltf(objCopy, { binary: true });
  const outPath = path.join(OUT_MODELS, "f1-car.glb");
  await fs.writeFile(outPath, Buffer.from(glb));
  const kb = Math.round((await fs.stat(outPath)).size / 1024);
  console.log(`GLB written: ${outPath} (${kb} KB)`);
}

async function debrandLivery() {
  const src = path.join(TEX_SRC, "formula1_DefaultMaterial_Diffuse.png");
  const SIZE = 1024;
  // hard downscale in a SEPARATE pass (sharp applies only one resize per
  // pipeline): any feature under ~50px in the 4k source (all logo text)
  // melts into its surrounding color field before the upscale
  const small = await sharp(src)
    .removeAlpha()
    .resize(112, 112, { fit: "fill" })
    .blur(0.6)
    .png()
    .toBuffer();
  const { data, info } = await sharp(small)
    .resize(SIZE, SIZE, { fit: "fill", kernel: "cubic" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    let best = 0;
    let bestD = Infinity;
    for (let p = 0; p < PALETTE.length; p++) {
      const [pr, pg, pb] = PALETTE[p].rgb;
      const d =
        (data[i] - pr) ** 2 + (data[i + 1] - pg) ** 2 + (data[i + 2] - pb) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    const [r, g, b] = PALETTE[best].rgb;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  const out = path.join(OUT_TEX, "livery.webp");
  await sharp(data, { raw: { width: SIZE, height: SIZE, channels: info.channels } })
    // median + slight blur: de-jags the two-tone boundaries
    .median(7)
    .blur(0.5)
    .webp({ quality: 88 })
    .toFile(out);
  console.log(`De-branded livery written: ${out}`);
}

async function originalLivery() {
  // full ORIGINAL replica livery (Ferrari + sponsor trademarks) for the
  // private build flavor — enabled via NEXT_PUBLIC_CAR_LIVERY=original.
  // Don't deploy this flavor publicly.
  const src = path.join(TEX_SRC, "formula1_DefaultMaterial_Diffuse.png");
  const out = path.join(OUT_TEX, "livery-original.webp");
  await sharp(src).resize(2048, 2048).webp({ quality: 90 }).toFile(out);
  console.log(`Original livery written: ${out}`);
}

async function roughnessFromGloss() {
  const src = path.join(TEX_SRC, "formula1_DefaultMaterial_Glossiness.png");
  const out = path.join(OUT_TEX, "roughness.webp");
  await sharp(src)
    .resize(1024, 1024)
    .linear(-1, 255) // roughness = 1 - glossiness
    .greyscale()
    .webp({ quality: 82 })
    .toFile(out);
  console.log(`Roughness written: ${out}`);
}

async function normalMap() {
  const src = path.join(TEX_SRC, "formula1_DefaultMaterial_Normal.png");
  const out = path.join(OUT_TEX, "normal.webp");
  await sharp(src).resize(2048, 2048).webp({ quality: 90 }).toFile(out);
  console.log(`Normal map written: ${out}`);
}

await fs.mkdir(OUT_TEX, { recursive: true });
await convertGeometry();
await debrandLivery();
await originalLivery();
await roughnessFromGloss();
await normalMap();
console.log("Done.");
