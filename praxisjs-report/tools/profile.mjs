// Headless CPU profile of one benchmark operation, aggregated by function self time.
// Usage (from the repo root, server running):
//   node praxisjs-report/tools/profile.mjs <framework dir (keyed/praxisjs) or page under frameworks/ (praxisjs-scenarios/index-local.html)> <op: create1k|create10k|clear|replace|update> [iterations] [top]
import { createRequire } from "node:module";

const require = createRequire(new URL("../../webdriver-ts/package.json", import.meta.url));
const puppeteer = require("puppeteer-core");

const [framework = "keyed/praxisjs", op = "create1k", iterations = "20", top = "40", callersOf = "", linesOf = ""] = process.argv.slice(2);
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({ headless: true, executablePath: chromePath, args: ["--no-sandbox"] });
const page = await browser.newPage();
const pagePath = framework.endsWith(".html") ? framework : `${framework}/index.html`;
await page.goto(`http://localhost:8080/frameworks/${pagePath}`, { waitUntil: "networkidle0" });
const client = await page.createCDPSession();
await client.send("Profiler.enable");
await client.send("Profiler.setSamplingInterval", { interval: 50 });

const ops = {
  create1k: { before: "clear", run: "run" },
  create10k: { before: "clear", run: "runlots" },
  replace: { before: "run", run: "run" },
  update: { before: "run", run: "update" },
  clear: { before: "run", run: "clear" },
};
const { before, run } = ops[op];

const timings = [];
const profiles = [];
for (let i = 0; i < Number(iterations); i++) {
  await page.evaluate((id) => { document.getElementById(id).click(); }, before);
  await new Promise((r) => setTimeout(r, 20));
  await client.send("Profiler.start");
  timings.push(await page.evaluate((id) => {
    const t = performance.now();
    document.getElementById(id).click();
    return performance.now() - t;
  }, run));
  profiles.push((await client.send("Profiler.stop")).profile);
  await new Promise((r) => setTimeout(r, 20));
}
await browser.close();

const self = new Map();
const callers = new Map();
const lineTicks = new Map();
let total = 0;
for (const profile of profiles) {
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parentOf = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parentOf.set(c, n);
for (let i = 0; i < profile.samples.length; i++) {
  const node = byId.get(profile.samples[i]);
  const dt = (profile.timeDeltas[i + 1] ?? 0) / 1000;
  const { functionName, url, lineNumber } = node.callFrame;
  if (functionName === "(idle)" || functionName === "(program)") continue;
  const key = `${functionName || "(anonymous)"} ${url.split("/").pop()}:${lineNumber + 1}`;
  self.set(key, (self.get(key) ?? 0) + dt);
  total += dt;
  // Optional: per-line ticks inside functions defined at a given line (e.g. "main.js:2620").
  if (linesOf !== "" && `${url.split("/").pop()}:${lineNumber + 1}` === linesOf) {
    for (const t of node.positionTicks ?? []) lineTicks.set(t.line, (lineTicks.get(t.line) ?? 0) + t.ticks);
  }
  // Optional: who calls a given (native) function, e.g. "appendChild".
  if (callersOf !== "" && functionName === callersOf) {
    const p = parentOf.get(node.id);
    const pf = p ? { url: "", lineNumber: -1, ...p.callFrame } : null;
    const ck = pf ? `${pf.functionName || "(anonymous)"} ${pf.url.split("/").pop()}:${pf.lineNumber + 1}` : "(root)";
    callers.set(ck, (callers.get(ck) ?? 0) + dt);
  }
}
}
timings.sort((a, b) => a - b);
console.log(`${framework} ${op}: median click ${timings[timings.length >> 1].toFixed(2)} ms, sampled ${total.toFixed(1)} ms`);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, Number(top))) {
  console.log(`${v.toFixed(1).padStart(8)} ms ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`);
}
if (callersOf !== "") {
  console.log(`\ncallers of ${callersOf}:`);
  for (const [k, v] of [...callers].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`${v.toFixed(1).padStart(8)} ms  ${k}`);
}
if (linesOf !== "") {
  console.log(`\nline ticks in ${linesOf}:`);
  for (const [line, ticks] of [...lineTicks].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`${String(ticks).padStart(6)}  line ${line}`);
}
