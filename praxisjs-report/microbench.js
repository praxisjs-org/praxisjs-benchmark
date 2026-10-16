// Paste into the console of a benchmark entry page (or run through the browser pane) to measure
// script-only time of the main operations: medians over N runs, no layout or paint included.
(async () => {
  const N = 20;
  const click = (id) => document.getElementById(id).click();
  const time = (fn) => { const t = performance.now(); fn(); return performance.now() - t; };
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return +s[s.length >> 1].toFixed(2); };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const r = { create1k: [], replace1k: [], update: [], select: [], swap: [], remove: [], append: [], clear1k: [], create10k: [], clear10k: [] };
  for (let i = 0; i < N; i++) {
    click("clear"); await tick();
    r.create1k.push(time(() => click("run"))); await tick();
    r.replace1k.push(time(() => click("run"))); await tick();
    r.update.push(time(() => click("update"))); await tick();
    r.select.push(time(() => document.querySelector("tbody>tr:nth-child(5)>td:nth-child(2)>a").click())); await tick();
    r.swap.push(time(() => click("swaprows"))); await tick();
    r.remove.push(time(() => document.querySelector("tbody>tr:nth-child(4)>td:nth-child(3)>a").click())); await tick();
    r.append.push(time(() => click("add"))); await tick();
    r.clear1k.push(time(() => click("clear"))); await tick();
    if (i % 4 === 0) {
      r.create10k.push(time(() => click("runlots"))); await tick();
      r.clear10k.push(time(() => click("clear"))); await tick();
    }
  }
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, median(v)]));
})();
