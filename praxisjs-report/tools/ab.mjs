// Median click time of one operation, over several rounds of N clicks, headless. With `async` as
// the last argument the time also covers the microtasks the click queued (until a MessageChannel
// message, which costs every framework the same, comes back).
// Usage: node praxisjs-report/tools/ab.mjs <page> <op> [rounds] [clicks] [sync|async]
import { createRequire } from "node:module";

const require = createRequire(new URL("../../webdriver-ts/package.json", import.meta.url));
const puppeteer = require("puppeteer-core");
const [framework = "keyed/praxisjs", op = "create1k", rounds = "8", clicks = "40", mode = "sync"] = process.argv.slice(2);
const ops = { create1k: ["clear", "run"], create10k: ["clear", "runlots"], replace: ["run", "run"], clear: ["run", "clear"], update: ["run", "update"], append: ["run", "add"] };
const [before, run] = ops[op];
const browser = await puppeteer.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
const page = await browser.newPage();
const path = framework.endsWith(".html") ? framework : `${framework}/index.html`;
await page.goto(`http://localhost:8080/frameworks/${path}`, { waitUntil: "networkidle0" });
const medians = [];
for (let r = 0; r < Number(rounds); r++) {
  const times = await page.evaluate(async (b, x, n, drain) => {
    const out = [];
    const settle = () => new Promise((res) => { const c = new MessageChannel(); c.port1.onmessage = res; c.port2.postMessage(0); });
    for (let i = 0; i < n; i++) {
      document.getElementById(b).click();
      await new Promise((res) => setTimeout(res, 0));
      const t = performance.now();
      document.getElementById(x).click();
      if (drain) await settle();
      out.push(performance.now() - t);
      await new Promise((res) => setTimeout(res, 0));
    }
    return out;
  }, before, run, Number(clicks), mode === "async");
  times.sort((a, b) => a - b);
  medians.push(times[times.length >> 1]);
}
await browser.close();
medians.sort((a, b) => a - b);
console.log(`${framework} ${op} (${mode}): median ${medians[medians.length >> 1].toFixed(3)} ms (rounds: ${medians.map((m) => m.toFixed(2)).join(" ")})`);
