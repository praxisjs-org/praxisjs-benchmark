// Startup cost of one or more entries under the size benchmark's conditions: a fresh browser per page
// load (no HTTP or V8 code cache), brotli compression enabled on the server (it compresses every
// response synchronously, so bytes cost time before the first paint), the same Chrome flags as the
// runner. Entries are interleaved load by load so they share the machine's noise.
// Each round does one plain load (first paint, first contentful paint, memory at ready the way
// 21_ready-memory reads it) and one traced load (script compile / evaluation time, from the
// devtools.timeline trace). Prints medians.
// Usage: node praxisjs-report/tools/startup.mjs <framework dir>[,<framework dir>...] [rounds] [visible]
import { createRequire } from "node:module";

const require = createRequire(new URL("../../webdriver-ts/package.json", import.meta.url));
const puppeteer = require("puppeteer-core");
const [list = "keyed/praxisjs", rounds = "15", visible = ""] = process.argv.slice(2);
const frameworks = list.split(",");
const host = "http://localhost:8080";
const args = [
  "--window-size=1000,800",
  "--js-flags=--expose-gc",
  "--no-default-browser-check",
  "--disable-sync",
  "--no-first-run",
  "--disable-extensions",
  "--disable-features=Translate,PrivacySandboxSettings4,IPH_SidePanelGenericMenuFeature",
];
if (visible !== "visible") args.push("--headless=new");
const categories = ["devtools.timeline", "v8", "disabled-by-default-devtools.timeline", "blink.user_timing"];
const compileNames = new Set(["v8.compile", "v8.compileModule", "V8.CompileCode", "v8.parseOnBackground", "V8.ScriptCompiler"]);
const evalNames = new Set(["EvaluateScript", "v8.evaluateModule"]);

async function load(framework, traced) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args,
    defaultViewport: { width: 1000, height: 800 },
  });
  try {
    const page = await browser.newPage();
    if (traced) await page.tracing.start({ categories });
    await page.goto(`${host}/frameworks/${framework}/index.html`, { waitUntil: "networkidle0" });
    await page.waitForSelector("#run");
    if (traced) {
      const trace = JSON.parse(Buffer.from(await page.tracing.stop()).toString());
      let compile = 0;
      let evaluate = 0;
      for (const e of trace.traceEvents) {
        if (e.ph !== "X" || e.dur === undefined) continue;
        if (compileNames.has(e.name)) compile += e.dur;
        else if (evalNames.has(e.name)) evaluate += e.dur;
      }
      return { compile: compile / 1000, evaluate: evaluate / 1000 };
    }
    const paints = await page.evaluate(() => performance.getEntriesByType("paint").map((p) => [p.name, p.startTime]));
    const paint = Object.fromEntries(paints);
    await page.evaluate("window.gc()");
    await new Promise((r) => setTimeout(r, 40));
    const memory = (await page.evaluate("performance.measureUserAgentSpecificMemory()")).bytes / 1024 / 1024;
    const client = await page.createCDPSession();
    const heap = (await client.send("Runtime.getHeapUsage")).usedSize / 1024 / 1024;
    return { fp: paint["first-paint"], fcp: paint["first-contentful-paint"], memory, heap };
  } finally {
    await browser.close();
  }
}

const results = Object.fromEntries(frameworks.map((f) => [f, []]));
const on = await fetch(`${host}/enableCompression`);
if ((await on.text()) !== "OK") throw new Error("could not enable compression");
try {
  for (let r = 0; r < Number(rounds); r++) {
    const order = r % 2 === 0 ? frameworks : [...frameworks].reverse();
    for (const f of order) results[f].push({ ...(await load(f, false)), ...(await load(f, true)) });
  }
} finally {
  await fetch(`${host}/disableCompression`);
}

const median = (values) => {
  const s = values.filter((v) => v !== undefined).sort((a, b) => a - b);
  return s.length === 0 ? NaN : s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const keys = ["fp", "fcp", "compile", "evaluate", "memory", "heap"];
console.log(`rounds ${rounds}, ${visible === "visible" ? "visible" : "headless"}`);
console.log(["entry".padEnd(32), ...keys.map((k) => k.padStart(9))].join(""));
for (const f of frameworks) {
  const row = keys.map((k) => median(results[f].map((x) => x[k])).toFixed(k === "memory" || k === "heap" ? 3 : 2).padStart(9));
  console.log([f.padEnd(32), ...row].join(""));
}
