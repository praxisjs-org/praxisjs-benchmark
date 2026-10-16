// Click time of "create 1,000 rows" the way the benchmark measures it: on a freshly loaded page,
// after the same 5 warm-up runs (run + clear), so most code has not been optimized yet. The time is
// the synchronous click (no framework here queues work after it). Median over `pages` page loads,
// headless.
// With `bench` as the last argument it also does what the runner does right before the measured
// click: start tracing with the V8 CPU profiler category and force a full GC.
// Usage: node praxisjs-report/tools/cold.mjs <framework dir> [pages] [warmups] [plain|bench|trace|gc]
import { createRequire } from "node:module";

const require = createRequire(new URL("../../webdriver-ts/package.json", import.meta.url));
const puppeteer = require("puppeteer-core");
const [framework = "keyed/praxisjs", pages = "15", warmups = "5", mode = "plain"] = process.argv.slice(2);
const categories = ["disabled-by-default-v8.cpu_profiler", "blink.user_timing", "devtools.timeline", "disabled-by-default-devtools.timeline"];
const browser = await puppeteer.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: process.env.JS_FLAGS ? [`--js-flags=${process.env.JS_FLAGS}`] : [] });
const times = [];
for (let p = 0; p < Number(pages); p++) {
  const page = await browser.newPage();
  await page.goto(`http://localhost:8080/frameworks/${framework}/index.html`, { waitUntil: "networkidle0" });
  await page.evaluate(async (n) => {
    const frame = () => new Promise((res) => { setTimeout(res, 20); });
    for (let i = 0; i < n; i++) {
      document.getElementById("run").click();
      await frame();
      document.getElementById("clear").click();
      await frame();
    }
  }, Number(warmups));
  if (mode === "bench" || mode === "trace") await page.tracing.start({ categories });
  if (mode === "bench" || mode === "gc") {
    const client = await page.createCDPSession();
    await client.send("HeapProfiler.collectGarbage");
  }
  times.push(await page.evaluate(() => {
    const t = performance.now();
    document.getElementById("run").click();
    return performance.now() - t;
  }));
  if (mode === "bench" || mode === "trace") await page.tracing.stop();
  await page.close();
}
await browser.close();
times.sort((a, b) => a - b);
console.log(`${framework} cold create1k (${mode}): median ${times[times.length >> 1].toFixed(2)} ms (min ${times[0].toFixed(2)}, max ${times[times.length - 1].toFixed(2)})`);
