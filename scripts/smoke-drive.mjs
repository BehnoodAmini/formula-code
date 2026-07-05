import puppeteer from "puppeteer-core";

const OUT = process.argv[2];
const errors = [];

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--enable-unsafe-swiftshader", "--window-size=1440,900", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") {
    errors.push(`[${msg.type()}] ${msg.text()}`);
  }
});
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));

await page.goto("http://localhost:3000", { waitUntil: "networkidle2", timeout: 60000 });

// intro overlay: click skip if present
const skip = await page.$("button ::-p-text(SKIP INTRO)");
if (skip) {
  await skip.click();
}
// let the camera dolly settle into the hero pose
await new Promise((r) => setTimeout(r, 3500));
await page.screenshot({ path: `${OUT}/d1-hero.png` });

// scroll to garage, let the lazy scene mount and settle
await page.evaluate(() => {
  document.querySelector("#garage")?.scrollIntoView({ behavior: "instant", block: "start" });
});
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: `${OUT}/d2-garage.png` });

// click the Rear Wing part chip -> exploded view + callout
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    b.textContent.includes("Rear Wing"),
  );
  btn?.click();
});
await new Promise((r) => setTimeout(r, 1800));
await page.screenshot({ path: `${OUT}/d3-exploded.png` });

// switch to BUILD tab
await page.evaluate(() => {
  const tab = [...document.querySelectorAll('[role="tab"]')].find((b) =>
    b.textContent.includes("BUILD"),
  );
  tab?.click();
});
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/d4-build.png` });

// flip to Pit Lane Day and let the light rig cross-fade
await page.evaluate(() => {
  document.querySelector('[aria-labelledby="theme-switch-label"]')?.click();
});
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: `${OUT}/d5-day.png` });

// scroll to contact in day theme
await page.evaluate(() => {
  document.querySelector("#contact")?.scrollIntoView({ behavior: "instant", block: "center" });
});
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${OUT}/d6-contact.png` });

console.log("CONSOLE ISSUES:", errors.length ? "\n" + errors.join("\n") : "none");
await browser.close();
