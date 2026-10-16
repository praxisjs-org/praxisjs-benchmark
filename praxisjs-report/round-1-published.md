# Round 1 — published PraxisJS (before the optimizations)

Run on 2026-10-15, Chrome 154, macOS, js-framework-benchmark (keyed table), CPU benchmarks only,
5 iterations each (upstream uses 15). Medians of total duration (script + layout + paint), lower is
better. PraxisJS: `@praxisjs/core` 2.2.0, `runtime` 0.7.1, `decorators` 1.7.0, `jsx` 0.7.7,
`store` 2.0.4.

## Overall (weighted geometric mean, from the official results table)

| vanillajs | solid 1.9.3 | svelte 5.42.1 | vue 3.5.39 | lit 3.2.0 | preact-signals 11 | react-hooks 19.2 | **praxisjs** |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.00 | 1.13 | 1.16 | 1.27 | 1.28 | 1.39 | 1.53 | **1.77** |

## Per benchmark (ms, ratio vs vanillajs)

| benchmark | vanillajs | solid | svelte | vue | lit | preact-signals | react-hooks | **praxisjs** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| create 1k | 23.9 | 25.0 (1.05x) | 24.8 (1.04x) | 28.2 (1.18x) | 27.9 (1.17x) | 32.9 (1.38x) | 28.1 (1.18x) | **28.9 (1.21x)** |
| replace 1k | 24.6 | 27.5 (1.12x) | 28.9 (1.17x) | 31.2 (1.27x) | 30.3 (1.23x) | 37.7 (1.53x) | 34.9 (1.42x) | **32.2 (1.31x)** |
| update every 10th | 12.7 | 14.6 (1.15x) | 14.5 (1.14x) | 16.8 (1.32x) | 15.4 (1.21x) | 14.6 (1.15x) | 17.7 (1.39x) | **15.1 (1.19x)** |
| select row | 3.0 | 4.3 (1.43x) | 6.6 (2.20x) | 4.6 (1.53x) | 7.2 (2.40x) | 5.5 (1.83x) | 7.3 (2.43x) | **5.8 (1.93x)** |
| swap rows | 14.6 | 17.6 (1.21x) | 16.9 (1.16x) | 17.6 (1.21x) | 20.7 (1.42x) | 18.7 (1.28x) | 113.2 (7.75x) | **122.2 (8.37x)** |
| remove row | 12.4 | 13.3 (1.07x) | 13.6 (1.10x) | 16.0 (1.29x) | 14.5 (1.17x) | 14.6 (1.18x) | 14.7 (1.19x) | **61.4 (4.95x)** |
| create 10k | 249.7 | 267.2 (1.07x) | 279.7 (1.12x) | 301.3 (1.21x) | 293.5 (1.18x) | 347.0 (1.39x) | 444.1 (1.78x) | **304.5 (1.22x)** |
| append 1k | 27.3 | 28.8 (1.05x) | 29.0 (1.06x) | 31.1 (1.14x) | 33.8 (1.24x) | 37.7 (1.38x) | 34.1 (1.25x) | **62.1 (2.27x)** |
| clear | 10.4 | 15.0 (1.44x) | 13.0 (1.25x) | 15.6 (1.50x) | 16.4 (1.58x) | 19.0 (1.83x) | 20.9 (2.01x) | **16.0 (1.54x)** |

## Bundle size (built `dist`, gzip -9)

| solid | **praxisjs** | lit | preact-signals | svelte | vue | react-hooks |
|---:|---:|---:|---:|---:|---:|---:|
| 4.7 kB | **6.1 kB** | 7.8 kB | 8.9 kB | 10.4 kB | 25.3 kB | 59.7 kB |

## Reading the numbers

- **Where PraxisJS is competitive.** Create, replace, update, create 10k and clear land at
  1.2x to 1.5x of vanilla, in the same band as Vue and Lit and ahead of React and Preact.
  The bundle is the second smallest after Solid.
- **Where it loses.** Swap (8.4x), remove (5x) and append (2.3x). All three change the list
  structure, and PraxisJS has no list reconciliation: when the list arrow re-runs, every row is
  destroyed and recreated. Swap recreates 1000 rows to move 2, remove recreates 999 to drop 1,
  append recreates 1000 existing rows plus the 1000 new ones. These three alone pull the overall
  score from roughly Vue's level down to last place.
- **Keyed classification.** `npm run isKeyed` accepts create and remove as keyed but fails swap
  (1000 new `<tr>` nodes instead of 2 moved ones). The official results would list the entry as
  non-keyed.

## How the entry is written

`frameworks/keyed/praxisjs/src/app.tsx` follows
[fine-grained rows](https://praxisjs.org/docs/essentials/jsx#fine-grained-rows): the list arrow
reads only `rows`, each row reads its own content in nested arrows, `selected` stays as view state
on the component. Each row is a `ReactiveStore` with `@State() label`, so "update every 10th row"
touches only the 100 rows that changed.

The first version kept content in one `@State() labels: Record<number, string>`, exactly like the
docs example (`app-labels-record.tsx`, results in `results-labels-record/`). It scored 38.8 ms on
update (3.06x) because one write re-ran all 1000 label bindings, and each re-run replaces the text
node even when the value did not change. Per-row state brought it to 15.1 ms. Everything else
stayed within noise.

## Framework findings worth fixing in PraxisJS

1. **Keyed list reconciliation** (a `<For each={...} key={...}>` primitive or a keyed path in the
   reactive child). This is the single change that would move PraxisJS from last to roughly
   Vue/Lit level in this benchmark.
2. **Reactive text children replace the node on every re-run.** A binding that returns a string
   could update `nodeValue` on the existing text node instead of removing it and inserting a new
   one (`mountReactive` in `@praxisjs/runtime`). It would make the docs' `Record` pattern cheap.
3. **The docs' fine-grained rows example uses one `Record` state for all rows.** It scales poorly
   for frequent content updates. Docs could point to per-row reactive models for large lists.
4. **JSX typing:** `aria-hidden="true"` fails typecheck because string literal attributes are
   widened to `string` against `Booleanish`. Needed `{"true" as const}`.

## Reproduce

```bash
# from webdriver-ts/, with the server running (npm start at the repo root)
npm run bench -- keyed/praxisjs keyed/vanillajs keyed/solid keyed/svelte keyed/vue keyed/react-hooks keyed/preact-signals keyed/lit --count 5 --benchmark 01_ 02_ 03_ 04_ 05_ 06_ 07_ 08_ 09_
npm run results     # interactive table at http://localhost:8080/webdriver-ts-results/dist/index.html
cd .. && node praxisjs-report/summarize.mjs
```

About 12 minutes for 8 frameworks at 5 iterations. Upstream's "12 hours" is for all ~190
implementations at 15 iterations plus memory and startup benchmarks.
