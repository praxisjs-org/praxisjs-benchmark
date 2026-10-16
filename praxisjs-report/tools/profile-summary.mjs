// Bottom-up self time per function from a Chrome trace's CPU profile samples.
// Usage: node praxisjs-report/tools/profile-summary.mjs <trace.json> [filterUrlSubstring] [top]
import { readFileSync } from "node:fs";

const [file, filter = "", top = "40"] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(file, "utf8"));
const events = Array.isArray(raw) ? raw : raw.traceEvents;

const nodes = new Map();
const samples = [];
const deltas = [];
for (const e of events) {
  if (e.name !== "ProfileChunk") continue;
  const data = e.args?.data?.cpuProfile;
  if (data?.nodes) for (const n of data.nodes) nodes.set(n.id, n);
  if (data?.samples) samples.push(...data.samples);
  if (e.args?.data?.timeDeltas) deltas.push(...e.args.data.timeDeltas);
}

const self = new Map();
let total = 0;
for (let i = 0; i < samples.length; i++) {
  const n = nodes.get(samples[i]);
  if (!n) continue;
  const dt = (deltas[i + 1] ?? 0) / 1000;
  const cf = { url: "", lineNumber: -1, ...n.callFrame };
  if (filter && !cf.url.includes(filter) && cf.url !== "") continue;
  if (cf.functionName === "(idle)" || cf.functionName === "(program)") continue;
  const key = `${cf.functionName || "(anonymous)"} ${cf.url.split("/").pop()}:${cf.lineNumber + 1}`;
  self.set(key, (self.get(key) ?? 0) + dt);
  total += dt;
}
const rows = [...self].sort((a, b) => b[1] - a[1]).slice(0, Number(top));
console.log(`total sampled ms: ${total.toFixed(1)}`);
for (const [k, v] of rows) console.log(`${v.toFixed(1).padStart(8)} ms ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`);
