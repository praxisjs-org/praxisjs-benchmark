// CPU profile of "create 1,000 rows" under the runner's conditions (fresh page, 5 warm-up runs,
// then a forced full GC), aggregated by function self time over `pages` page loads, headless.
// `nogc` as the last argument skips the forced GC, to compare.
// Usage: node praxisjs-report/tools/profile-cold.mjs <framework dir> [pages] [top] [gc|nogc]
import { createRequire } from "node:module";

const require = createRequire(new URL("../../webdriver-ts/package.json", import.meta.url));
const puppeteer = require("puppeteer-core");
const [framework = "keyed/praxisjs", pages = "20", top = "40", gc = "gc"] = process.argv.slice(2);
const browser = await puppeteer.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const self = new Map();
let sampled = 0;
for (let p = 0; p < Number(pages); p++) {
  const page = await browser.newPage();
  await page.goto(`http://localhost:8080/frameworks/${framework}/index.html`, { waitUntil: "networkidle0" });
  await page.evaluate(async () => {
    const frame = () => new Promise((res) => { setTimeout(res, 20); });
    for (let i = 0; i < 5; i++) {
      document.getElementById("run").click();
      await frame();
      document.getElementById("clear").click();
      await frame();
    }
  });
  const client = await page.createCDPSession();
  if (gc === "gc") await client.send("HeapProfiler.collectGarbage");
  await client.send("Profiler.enable");
  await client.send("Profiler.setSamplingInterval", { interval: 20 });
  await client.send("Profiler.start");
  await page.evaluate(() => { document.getElementById("run").click(); });
  const { profile } = await client.send("Profiler.stop");
  const dt = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    dt.set(profile.samples[i], (dt.get(profile.samples[i]) ?? 0) + (profile.timeDeltas[i] ?? 0));
  }
  for (const node of profile.nodes) {
    const time = dt.get(node.id) ?? 0;
    if (time === 0) continue;
    const { functionName, url, lineNumber } = node.callFrame;
    if (functionName === "(idle)" || functionName === "(program)") continue;
    const key = `${functionName || "(anonymous)"} ${url.split("/").pop()}:${lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + time);
    sampled += time;
  }
  await page.close();
}
await browser.close();
console.log(`${framework}: sampled ${(sampled / 1000 / Number(pages)).toFixed(2)} ms per run`);
for (const [key, time] of [...self].sort((a, b) => b[1] - a[1]).slice(0, Number(top))) {
  console.log(`${(time / 1000 / Number(pages)).toFixed(3).padStart(8)} ms  ${key}`);
}
