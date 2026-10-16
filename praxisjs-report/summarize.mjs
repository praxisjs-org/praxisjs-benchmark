// Prints a markdown comparison table from webdriver-ts/results.
// Usage: node praxisjs-report/summarize.mjs (from the repo root)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "webdriver-ts/results";
const BENCHMARKS = [
  ["01_run1k", "create 1k"],
  ["02_replace1k", "replace 1k"],
  ["03_update10th1k_x16", "update 10th"],
  ["04_select1k", "select"],
  ["05_swap1k", "swap"],
  ["06_remove-one-1k", "remove"],
  ["07_create10k", "create 10k"],
  ["08_create1k-after1k_x2", "append 1k"],
  ["09_clear1k_x8", "clear"],
];

const data = {};
for (const file of readdirSync(dir)) {
  const r = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const name = r.framework.replace(/-v[\d.]+.*-keyed$|-keyed$/, "");
  data[name] ??= {};
  const value = r.values.total ?? r.values.DEFAULT ?? Object.values(r.values)[0];
  data[name][r.benchmark] = value.median ?? value.mean;
}

const base = data.vanillajs;
const ratio = (fw, b) => data[fw][b] / base[b];
const geo = (fw) => {
  const rs = BENCHMARKS.map(([b]) => ratio(fw, b)).filter(Number.isFinite);
  return Math.exp(rs.reduce((s, r) => s + Math.log(r), 0) / rs.length);
};

const frameworks = Object.keys(data).sort((a, b) => geo(a) - geo(b));

console.log(`| benchmark (ms, median) | ${frameworks.join(" | ")} |`);
console.log(`|---|${frameworks.map(() => "---:").join("|")}|`);
for (const [b, label] of BENCHMARKS) {
  console.log(`| ${label} | ${frameworks.map((fw) => `${data[fw][b].toFixed(1)} (${ratio(fw, b).toFixed(2)}x)`).join(" | ")} |`);
}
console.log(`| **geo mean vs vanilla** | ${frameworks.map((fw) => `**${geo(fw).toFixed(2)}**`).join(" | ")} |`);
