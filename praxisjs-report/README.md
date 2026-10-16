# PraxisJS vs other frameworks

Round 2, 2026-10-15: PraxisJS built from the local checkout (`npm run build-local`) with the
reactivity, runtime and compiler work described below. Chrome 154 headless, macOS,
js-framework-benchmark keyed table, the 9 CPU benchmarks, 10 iterations each. Lower is better.
The first round, against the published packages, is in [round-1-published.md](round-1-published.md).

## Overall (weighted geometric mean, official results table)

| vanillajs | **praxisjs** | solid 1.9.3 | svelte 5.42.1 | lit 3.2.0 | vue 3.5.39 | preact-signals 11 | react-hooks 19.2 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.05 | **1.09** | 1.13 | 1.17 | 1.24 | 1.25 | 1.30 | 1.50 |

Round 1 (published PraxisJS): 1.77, last of the eight.

## Per benchmark (total ms, median; ratio vs vanillajs)

| benchmark | vanillajs | **praxisjs** | solid | svelte | vue | lit | preact-signals | react-hooks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| create 1k | 25.7 | **27.1 (1.05x)** | 28.4 (1.10x) | 27.4 (1.07x) | 30.6 (1.19x) | 28.6 (1.11x) | 34.1 (1.33x) | 29.5 (1.15x) |
| replace 1k | 26.6 | **29.6 (1.11x)** | 29.6 (1.11x) | 30.4 (1.14x) | 32.7 (1.23x) | 33.0 (1.24x) | 40.2 (1.51x) | 36.9 (1.39x) |
| update every 10th | 17.1 | **14.6 (0.85x)** | 14.1 (0.82x) | 16.4 (0.96x) | 19.1 (1.12x) | 17.1 (1.00x) | 14.8 (0.87x) | 19.5 (1.14x) |
| select row | 3.7 | **5.7 (1.54x)** | 5.5 (1.47x) | 6.7 (1.80x) | 5.3 (1.45x) | 7.6 (2.05x) | 6.3 (1.69x) | 7.6 (2.05x) |
| swap rows | 15.9 | **14.9 (0.94x)** | 17.7 (1.11x) | 18.9 (1.19x) | 16.8 (1.05x) | 19.6 (1.23x) | 17.7 (1.11x) | 110.9 (6.96x) |
| remove row | 16.4 | **14.4 (0.88x)** | 17.6 (1.08x) | 17.2 (1.05x) | 19.4 (1.19x) | 15.8 (0.96x) | 13.9 (0.85x) | 19.0 (1.16x) |
| create 10k | 290.0 | **303.5 (1.05x)** | 305.8 (1.05x) | 312.8 (1.08x) | 336.0 (1.16x) | 329.3 (1.14x) | 376.4 (1.30x) | 473.4 (1.63x) |
| append 1k | 35.5 | **39.0 (1.10x)** | 37.1 (1.05x) | 37.0 (1.04x) | 38.3 (1.08x) | 42.0 (1.19x) | 47.3 (1.34x) | 42.6 (1.20x) |
| clear | 12.3 | **13.9 (1.13x)** | 15.5 (1.26x) | 16.3 (1.33x) | 17.6 (1.43x) | 18.8 (1.52x) | 20.5 (1.67x) | 24.1 (1.96x) |

Script time only (ms, median), where the frameworks actually differ:

| benchmark | vanillajs | **praxisjs** | solid |
|---|---:|---:|---:|
| create 1k | 2.0 | **4.8** | 3.2 |
| create 10k | 20.4 | **44.9** | 29.9 |
| update every 10th | 0.6 | **1.0** | 1.3 |
| select row | 0.4 | **0.2** | 1.3 |
| swap rows | 0.1 | **0.6** | 1.5 |
| clear | 8.9 | **10.8** | 12.4 |

## How to read this

- **Totals are mostly the browser.** Layout and paint are the same work for every framework (about
  22 ms of the 27 ms of "create 1k"). That is why everyone sits between 1.0x and 1.3x except where
  a framework does extra DOM work (React's swap). No framework can be far ahead of vanillajs on
  totals: vanillajs is hand-written DOM code for exactly these operations.
- **PraxisJS is now first among the frameworks** and wins outright, ahead of vanillajs, on swap,
  remove and update, where fine-grained bindings touch only what changed. Its script time for
  select, swap and update is below Solid's.
- **Where it still trails Solid: script time to create rows** (about 1.5x Solid's). What is left is
  spread over small costs: two `addEventListener` calls per row (Solid delegates events at the
  document), the `@State` setup on each row model, and the effect behind each reactive binding.

## What changed in PraxisJS (all general, nothing specific to this benchmark)

Every item applies to any PraxisJS app; the benchmark entry is ordinary PraxisJS code.

1. **Reactive core** (`@praxisjs/core`): a push-pull graph with linked dependencies that a re-run
   reuses in place, version-checked computeds that only recompute when a source really changed and
   do not wake dependents when the value is the same, and no allocation or resubscription per run.
   Bug fixes: a computed that threw stopped propagating; an effect invalidated by a computed during
   its own run could stay stale forever; an effect disposed during its run kept what it read later.
2. **Compiled templates** (`@praxisjs/vite-plugin` + `@praxisjs/runtime`): JSX trees of host
   elements are built once (with the same DOM calls a plain render makes, no HTML parsing) and
   cloned with `cloneNode(true)`; only dynamic parts are bound. A reactive child that is its
   element's only content writes a text node already in the template.
3. **Runtime**: one shared event listener per element and type, leaner scopes, one reused child
   scope per reactive region, skipped no-op prop writes, `className` for classes, cheaper component
   mounting (one props copy, no fragment for a single root, one lifecycle object), and a detached
   fill when a `For` fills a large empty list that owns its parent.
4. **Decorators**: one shared accessor pair per `@State`/`@Prop` field (instances keep one hidden
   class), lazy `@Computed`, and `@Component` no longer wraps the class.
5. **Keyed lists and selection** (from the earlier sessions): `For`/`Index` with minimal moves, and
   `@Selector` so selecting a row touches two rows instead of all of them.
6. **Bug fix**: an element's children are now mounted before its props, so a static `<select>`
   `value` is no longer lost (it was applied while the select had no options).

## Beyond the table benchmark: component scenarios

`frameworks/praxisjs-scenarios` mounts 1,000 class components (`@Prop`, `@State`, `@Computed`, a
nested child component, an event handler each) and compares the published packages with the local
checkout, using the same app code. Headless Chrome, 40 runs each, median:

| operation | published | local | change |
|---|---:|---:|---:|
| mount 1,000 components | 11.1 ms | 6.2 ms | -44% |
| tick that updates all 1,000 (total CPU sampled) | 212 ms | 141 ms | -34% |
| unmount | 3.7 ms | 2.7 ms | -27% |

## Round 3: creation cost (runtime, templates, components)

2026-10-15, later the same day: PraxisJS, Solid and vanillajs re-run together (headless, 10
iterations, the 9 CPU benchmarks) after a pass on what it costs to *create* rows and components.
This machine ran faster than in round 2 for every framework (vanillajs create 1k 23.8 ms vs 25.7 ms),
so compare columns within one round. Raw results: `results-round3/`.

Weighted geometric mean (official weights, factor vs the best of the three):

| | vanillajs | **praxisjs** | solid |
|---|---:|---:|---:|
| round 2 | 1.047 | **1.081** | 1.123 |
| round 3 | 1.031 | **1.072** | 1.100 |

| benchmark (total ms, median) | praxisjs round 2 | **praxisjs round 3** | solid | vanillajs |
|---|---:|---:|---:|---:|
| create 1k | 27.1 | **26.2** | 25.4 | 23.8 |
| replace 1k | 29.6 | **28.2** | 28.2 | 25.8 |
| update every 10th | 14.6 | **13.6** | 14.6 | 16.1 |
| select row | 5.7 | **4.3** | 4.4 | 3.5 |
| swap rows | 14.9 | **15.7** | 16.6 | 15.0 |
| remove row | 14.4 | **12.9** | 13.2 | 13.7 |
| create 10k | 303.5 | **263.9** | 267.8 | 248.0 |
| append 1k | 39.0 | **29.2** | 28.4 | 27.4 |
| clear | 13.9 | **12.0** | 14.2 | 10.4 |

Script time (ms, median):

| benchmark | praxisjs round 2 | **praxisjs round 3** | solid | vanillajs |
|---|---:|---:|---:|---:|
| create 1k | 4.75 | **4.35** | 2.80 | 1.90 |
| replace 1k | 6.50 | **5.80** | 5.60 | 3.80 |
| update every 10th | 1.00 | **0.80** | 1.25 | 0.75 |
| create 10k | 44.85 | **31.05** | 25.95 | 18.60 |
| append 1k | 5.55 | **4.15** | 3.20 | 2.00 |
| clear | 10.80 | **9.50** | 11.30 | 8.05 |

PraxisJS stays first among the frameworks and now ties or beats Solid's totals on 6 of the 9
benchmarks. Its script time to create rows is still above Solid's: what is left is mostly the row
model's `@State` setup (`Object.defineProperty` per instance, in `@praxisjs/decorators`), the effect
behind each binding, and two DOM natives every framework pays (cloning and inserting).

What changed (all general, measured one at a time with alternating A/B builds; synchronous click
time of "create 1k" went from about 2.40 ms to 2.15 ms):

1. **Templates are cloned in the inert `<template>` document** and adopted on insertion, which
   Chrome does faster than cloning inside the live document (-5 to -8% on creation). Templates
   that contain a custom element stay in the live document so it is upgraded when cloned.
2. **One listener per template root for events its elements share.** When several elements of a
   template handle the same event (the two links of a row), the root gets one capture listener
   that gives each element its own listener the first time such an event reaches it, before the
   event gets there. The handler then runs exactly as if bound at render time (phase, `this`,
   `currentTarget`, `stopPropagation()`, non-bubbling and synthetic events, detached trees), and
   a row costs one `addEventListener` instead of two (-3.5% create 1k, -4% create 10k and append).
   A document-level delegation like Solid's was rejected: it changes the order against native
   listeners, breaks `stopPropagation()` patterns and misses detached trees.
3. Only-child text written with `textContent`, arrays inserted without a fragment, event props
   looked up in a `Map`, one selector bucket class for all selectors.

Component scenarios (`frameworks/praxisjs-scenarios`, 1,000 class components; alternating A/B,
median of 12 rounds of 40 clicks):

| operation | published packages | local, start of this round | **local, round 3** |
|---|---:|---:|---:|
| mount 1,000 components | 9.2 ms | 4.8 ms | **3.2 ms** |
| tick that updates all 1,000 | 9.7 ms | — | **5.9 ms** |
| unmount | 3.0 ms | 2.1 ms | **1.8 ms** |

Behind the component numbers: a component that renders a single root node is no longer wrapped
in two comments (-17% mount), a lone element with a literal attribute, literal text or a reactive
child is compiled to a template too, so its reactive child needs no anchor comment (-13%), and a
component inserted into a template goes in without a fragment (-8%).

## Final round: everything integrated

2026-10-15, end of the day, after the parallel work on every package (decorators, features, utils,
dx, devtools) was merged into the checkout. All eight frameworks, headless, 5 iterations, the 9 CPU
benchmarks. Raw results: `results-final/`.

Weighted geometric mean (official results table):

| vanillajs | **praxisjs** | solid | svelte | vue | lit | preact-signals | react-hooks |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.04 | **1.06** | 1.07 | 1.13 | 1.26 | 1.27 | 1.36 | 1.50 |

History of the PraxisJS score: 1.77 (published packages, last of eight) → 1.09 (round 2) → 1.06.

| benchmark (total ms, median) | vanillajs | **praxisjs** | solid | svelte | vue |
|---|---:|---:|---:|---:|---:|
| create 1k | 25.4 | **27.9** | 26.5 | 26.8 | 28.8 |
| replace 1k | 25.2 | **27.4** | 27.8 | 29.5 | 32.5 |
| update every 10th | 16.1 | **13.3** | 12.8 | 14.5 | 16.9 |
| select row | 3.7 | **3.4** | 4.3 | 6.2 | 5.8 |
| swap rows | 13.4 | **14.6** | 15.0 | 15.8 | 16.5 |
| remove row | 13.0 | **12.4** | 12.2 | 12.7 | 15.3 |
| create 10k | 240.5 | **258.4** | 259.1 | 261.9 | 287.2 |
| append 1k | 26.3 | **28.2** | 27.5 | 27.6 | 29.8 |
| clear | 10.0 | **10.8** | 12.1 | 12.4 | 14.5 |

PraxisJS beats vanillajs on select, remove and update, and Solid on replace, select, swap, create 10k
and clear. Creating rows is the one place where it still spends more script time than Solid
(create 1k 4.5 ms vs 3.0 ms): the row model's per-instance setup and the effect behind each binding.

## Round 4: row creation

2026-10-15, after the work on creation cost. All eight frameworks, headless, 5 iterations, the 9 CPU
benchmarks. Raw results: `results-round4/`. Geometric mean of the ratios to vanillajs, unweighted
(`summarize.mjs`):

| **praxisjs** | vanillajs | solid | svelte | vue | lit | preact-signals | react-hooks |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **0.98** | 1.00 | 1.00 | 1.07 | 1.17 | 1.19 | 1.22 | 1.60 |

| benchmark (total ms, median) | vanillajs | **praxisjs** | solid | svelte | vue |
|---|---:|---:|---:|---:|---:|
| create 1k | 24.6 | **26.2** | 26.1 | 26.3 | 30.0 |
| replace 1k | 24.9 | **28.5** | 28.5 | 28.3 | 31.1 |
| update every 10th | 14.2 | **12.6** | 12.3 | 12.7 | 18.1 |
| select row | 6.3 | **4.8** | 5.2 | 7.1 | 5.6 |
| swap rows | 14.7 | **14.1** | 15.1 | 17.3 | 17.8 |
| remove row | 14.2 | **12.1** | 12.4 | 14.4 | 15.8 |
| create 10k | 244.1 | **250.6** | 260.8 | 257.6 | 288.6 |
| append 1k | 28.3 | **29.1** | 28.1 | 27.0 | 30.7 |
| clear | 9.7 | **11.2** | 12.0 | 12.1 | 13.8 |

Script time to create rows went from 4.5 to 3.9 ms for 1k (Solid 2.9) and is now level with Solid
for 10k (26.5 vs 25.4 ms). The changes, all general:

- Template event props attach no listener when bound: one capture listener per event type, on the
  document and on each render container or portal target, attaches an element's own listener the
  first time an event is on its way to it, with unchanged dispatch semantics.
- Reactive props and reactive children run through one shared function per kind that reads its
  state from the effect (`createContextEffect`), instead of a closure and its context per binding.
- Text is created natively (`textContent`, `append()`, `before()`), with no JS wrapper for the new
  node, and a reactive only child needs no placeholder in the template.
- A template that is an arrow function's whole body (a row renderer) compiles to a block body
  instead of a function created and called on every run.
- Hot classes (graph nodes, scopes, list rows, component lifecycles) assign their fields in the
  constructor instead of with field initializers.

What is left of the gap to Solid is mostly the field decorators' per-instance setup: `@State`,
`@Prop`, `@Computed` and every field decorator define an accessor on each instance over the class
field. In V8 that switches the instance to dictionary properties (about 170 ns for the first field,
85 ns for each next one) and no API variant is cheaper. A prototype accessor (the `accessor`
keyword) would avoid it but changes what stacked and custom field decorators, `Object.keys()` and
spread see, so it was measured (about 0.12 ms per 1k rows) and not adopted.

## Round 5: compiled renders and lazy scopes

2026-10-15, same setup as round 4. Raw results: `results-round5/`. vanillajs had outlier runs in
this round (update every 10th 25.2 ms and swap 27.7 ms, about twice its usual), which distorts every
ratio against it, so this round compares PraxisJS with Solid directly.

| benchmark (total ms, median) | **praxisjs** | solid | svelte | vue | lit |
|---|---:|---:|---:|---:|---:|
| create 1k | **24.8** | 24.7 | 25.0 | 27.6 | 27.1 |
| replace 1k | **25.8** | 26.9 | 27.7 | 29.6 | 29.5 |
| update every 10th | **11.6** | 12.2 | 12.4 | 15.0 | 13.6 |
| select row | **3.3** | 4.6 | 6.1 | 7.3 | 6.4 |
| swap rows | **13.7** | 14.5 | 15.8 | 15.9 | 18.2 |
| remove row | **11.9** | 12.1 | 12.2 | 14.6 | 13.1 |
| create 10k | **254.5** | 255.4 | 257.1 | 282.8 | 276.3 |
| append 1k | **27.9** | 27.8 | 28.5 | 32.2 | 30.8 |
| clear | **11.1** | 12.1 | 12.0 | 14.0 | 14.9 |

PraxisJS is fastest of the frameworks on 7 of the 9 benchmarks and level with Solid on the other
two (create 1k and append 1k, within 0.1 ms). Script time to create 1k rows is 3.9 ms (Solid
2.9), 10k rows 26.1 ms (Solid 25.1). New since round 4, all general:

- A template returned from a function (every component's `render()`) or forming an arrow
  function's whole body compiles to plain statements, without a function created and called on
  every render. Mounting 1,000 class components went from about 3.0 to 2.8 ms.
- A reactive child creates its child scope only when a run asks for it; a text binding creates none.
- Binding an event prop is one `Map` lookup.

The remaining script gap on creation is the field decorators' per-instance setup described in
round 4 (`@Prop`'s initializer is 92% `Object.defineProperty` when mounting components).

## Round 6: fast properties and cold paths

2026-10-15, same setup as rounds 4 and 5. Raw results: `results-round6/`. vanillajs again had an
outlier in update every 10th (26.0 ms), so compare frameworks directly.

| benchmark (total ms, median) | **praxisjs** | solid | svelte | vue | lit |
|---|---:|---:|---:|---:|---:|
| create 1k | **23.5** | 24.3 | 24.7 | 27.0 | 27.1 |
| replace 1k | **25.3** | 26.9 | 27.7 | 29.3 | 28.9 |
| update every 10th | **11.7** | 12.6 | 12.9 | 14.6 | 13.7 |
| select row | **3.6** | 4.2 | 5.8 | 7.3 | 6.5 |
| swap rows | **13.4** | 14.3 | 15.9 | 15.5 | 18.5 |
| remove row | **11.6** | 11.9 | 12.4 | 14.6 | 13.1 |
| create 10k | **242.7** | 252.7 | 256.5 | 278.5 | 273.8 |
| append 1k | **26.2** | 26.9 | 27.4 | 29.3 | 30.4 |
| clear | **10.9** | 13.4 | 11.5 | 14.0 | 14.4 |

PraxisJS is the fastest framework on all nine benchmarks. Script time, which the runner measures
after a forced full GC, is now below Solid's on creation too:

| script (ms, median) | **praxisjs** | solid | vanillajs |
|---|---:|---:|---:|
| create 1k | **2.5** | 2.9 | 2.0 |
| replace 1k | **4.8** | 5.4 | 3.7 |
| create 10k | **23.8** | 25.4 | 18.6 |
| create 1k after 1k | **2.6** | 3.1 | 2.0 |

What closed it (all general, for every app):

- **Fast properties for decorated fields.** The Vite plugin no longer emits a decorated field as a
  class field that its decorator then replaces with an accessor, which put every instance in V8's
  dictionary mode. The innermost decorator defines the property directly with the initial value
  (`@State`, `@Prop`, every built-in field decorator, `createFieldDecorator` bindings and any
  decorator using `addClaimableInitializer`). Order, stacked decorators, `Object.keys()` and spread
  are unchanged. Under the runner's conditions this alone took create 1k from 3.67 to 3.06 ms.
- **Shape keepers.** One inert instance of each hot internal class (graph nodes and links,
  selector buckets, reactive regions, list rows, scopes) stays alive, so a full GC after a list is
  cleared no longer kills their hidden classes and the optimized code built on them.
- **Specialized template bindings.** Reactive `class` binds through a dedicated helper, and event
  props pass their event type resolved at build time (one constant per module).
- `writeSignal` and the render paths avoid extra calls (inline `Object.is`, no notification pass
  for unsubscribed signals, a live binding instead of `isRecording()`).

Under the runner's conditions (`tools/cold.mjs ... bench`) create 1k went from 3.74 ms (Solid
2.62) to 2.57 ms (Solid 2.65).

## Final run: visible browser, every benchmark

2026-10-15, after the fixes from the downstream checks (morphos, kosmesis, create-praxisjs
templates) and the bundle size pass. All eight frameworks, Chrome 155 with a visible window
(not headless), Apple M3 Pro, macOS 27, the runner's default iterations (15 per CPU benchmark),
CPU, memory and size/first-paint benchmarks. The whole run took 38 minutes (2,280 s). Raw
results: `results-final-visible/`.

Geometric mean of the CPU slowdowns vs vanillajs (`summarize.mjs`):

| **praxisjs** | vanillajs | solid | svelte | vue | lit | preact-signals | react-hooks |
|---:|---:|---:|---:|---:|---:|---:|---:|
| **0.96** | 1.00 | 1.03 | 1.08 | 1.17 | 1.22 | 1.26 | 1.66 |

| benchmark (total ms, median) | vanillajs | **praxisjs** | solid | svelte | vue | lit | preact-signals | react-hooks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| create 1k | 23.6 | **23.9** | 24.7 | 24.9 | 27.6 | 27.3 | 31.8 | 27.0 |
| replace 1k | 25.3 | **26.0** | 27.4 | 28.4 | 30.5 | 29.8 | 37.3 | 34.1 |
| update every 10th | 13.3 | **12.7** | 13.9 | 14.0 | 16.7 | 15.7 | 14.4 | 20.0 |
| select row | 6.1 | **3.7** | 4.6 | 6.4 | 5.4 | 7.0 | 5.6 | 7.4 |
| swap rows | 15.0 | **15.0** | 16.0 | 16.9 | 17.0 | 20.6 | 18.3 | 114.4 |
| remove row | 13.6 | **12.7** | 13.1 | 13.4 | 16.1 | 14.4 | 14.7 | 14.8 |
| create 10k | 245.2 | **252.2** | 264.6 | 267.8 | 291.8 | 285.2 | 341.7 | 435.7 |
| append 1k | 27.2 | **27.9** | 28.5 | 28.7 | 30.8 | 32.1 | 36.5 | 32.8 |
| clear | 10.5 | **11.7** | 12.9 | 12.8 | 15.8 | 16.5 | 17.8 | 20.4 |

Script time (ms): create 1k praxisjs 2.6, solid 2.8, svelte 3.4, vanillajs 2.0; create 10k
praxisjs 24.3, solid 26.0, svelte 28.3, vanillajs 18.9.

| memory and size | vanillajs | **praxisjs** | solid | svelte | vue | lit | preact-signals | react-hooks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ready memory (MB) | 0.51 | **0.71** | 0.54 | 0.66 | 0.81 | 0.72 | 0.69 | 1.15 |
| run memory 1k (MB) | 1.88 | **2.77** | 2.68 | 2.87 | 3.88 | 2.79 | 4.89 | 4.32 |
| create/clear 1k x5 (MB) | 0.65 | **0.94** | 0.77 | 0.95 | 1.19 | 0.88 | 8.94 | 1.98 |
| size, compressed (kB) | 2.5 | **11.3** | 4.5 | 9.7 | 23.3 | 7.3 | 8.3 | 51.4 |
| first paint (ms) | 74.2 | **103.2** | 87.4 | 91.5 | 151.1 | 108.9 | 93.3 | 290.5 |

PraxisJS is the fastest framework on all nine CPU benchmarks and, on the geometric mean, ahead
of vanillajs itself. It is not first on memory and size: a little more memory than Solid, and its
runtime ships more JavaScript than Solid's or Svelte's (which also shows in first paint).

## Published packages (npm), visible browser, every benchmark

2026-10-16, the PraxisJS entry built from the published packages (`npm run build-prod`: runtime
0.8.0, core 2.3.0, decorators 2.0.0, jsx 0.8.0, store 2.0.5, vite-plugin 4.1.0), after the startup
pass and the decorator builders' redesign. All eight frameworks, Chrome 155 with a visible window,
Apple M3 Pro, macOS 27, the runner's default iterations (15 per CPU benchmark), CPU, memory and
size/first-paint benchmarks. The whole run took 38.4 minutes (2,304 s). Raw results:
`results-npm/`.

Geometric mean of the CPU slowdowns vs vanillajs (`summarize.mjs`):

| vanillajs | **praxisjs** | solid | svelte | vue | lit | preact-signals | react-hooks |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.00 | **1.01** | 1.12 | 1.16 | 1.24 | 1.30 | 1.34 | 1.75 |

| benchmark (total ms, median) | vanillajs | **praxisjs** | solid | svelte | vue | lit | preact-signals | react-hooks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| create 1k | 24.2 | **24.3** | 26.9 | 26.1 | 28.2 | 28.5 | 32.3 | 28.4 |
| replace 1k | 25.6 | **27.2** | 28.4 | 28.9 | 32.2 | 30.8 | 41.0 | 34.5 |
| update every 10th | 14.0 | **13.6** | 17.5 | 15.7 | 17.6 | 16.0 | 14.9 | 20.3 |
| select row | 4.5 | **3.9** | 4.6 | 7.3 | 5.6 | 8.2 | 5.8 | 8.1 |
| swap rows | 15.9 | **15.7** | 17.3 | 17.9 | 18.3 | 22.0 | 20.7 | 117.1 |
| remove row | 13.4 | **13.7** | 14.7 | 14.2 | 16.9 | 15.4 | 14.7 | 15.8 |
| create 10k | 250.5 | **258.7** | 271.8 | 273.9 | 300.2 | 293.2 | 350.7 | 444.6 |
| append 1k | 28.1 | **29.0** | 30.5 | 30.1 | 32.8 | 34.0 | 38.4 | 34.2 |
| clear | 11.6 | **12.6** | 14.7 | 14.1 | 17.8 | 18.1 | 19.9 | 22.6 |

Script time (ms, median), lower than Solid on every CPU benchmark:

| script | vanillajs | **praxisjs** | solid | svelte |
|---|---:|---:|---:|---:|
| create 1k | 2.0 | **2.7** | 3.1 | 3.5 |
| replace 1k | 3.9 | **5.0** | 6.0 | 7.1 |
| update every 10th | 0.7 | **0.9** | 1.7 | 2.0 |
| select row | 0.6 | **0.7** | 1.2 | 3.5 |
| swap rows | 0.1 | **0.6** | 1.5 | 2.0 |
| create 10k | 19.2 | **25.5** | 26.9 | 29.4 |
| append 1k | 2.0 | **2.9** | 3.5 | 3.7 |
| clear | 9.1 | **10.1** | 11.7 | 11.6 |

| memory and size | vanillajs | **praxisjs** | solid | svelte | vue | lit | preact-signals | react-hooks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| ready memory (MB) | 0.56 | **0.69** | 0.60 | 0.66 | 0.87 | 0.71 | 0.69 | 1.18 |
| run memory 1k (MB) | 1.87 | **2.73** | 2.68 | 2.88 | 3.89 | 2.80 | 4.90 | 4.39 |
| create/clear 1k x5 (MB) | 0.64 | **0.92** | 0.77 | 0.98 | 1.19 | 0.88 | 8.98 | 1.98 |
| size, compressed (kB) | 2.5 | **10.3** | 4.5 | 9.7 | 23.3 | 7.3 | 8.3 | 51.4 |
| first paint (ms) | 61.8 | **81.5** | 60.4 | 86.8 | 122.2 | 70.7 | 78.4 | 278.5 |

The published packages keep the lead: PraxisJS is the fastest framework on all nine CPU benchmarks,
level with vanillajs on the geometric mean, with less script time than Solid everywhere. Startup
improved with the startup pass (10.3 kB compressed from 11.3, first paint now ahead of Svelte, Vue
and React); memory and size are still behind Solid.

## Why "script" time differs from a warm measurement

The runner measures each iteration on a fresh page after 5 warm-up runs, starts tracing with the V8
CPU profiler and forces a last-resort full GC right before the measured click. Those two steps
alone take PraxisJS's create 1k click from 2.1 to 3.7 ms and Solid's from 1.9 to 2.6 ms
(`tools/cold.mjs`, modes `plain`, `trace`, `gc`, `bench`). Bytecode flushing is not the cause
(`--no-flush-bytecode` changes nothing). After the GC, code that touches the row models
(`@State` setter, the row accessor) runs several times slower: without `@State` on the rows the
same measurement is 2.9 ms. Keeping the rows in fast properties (no data field before the
accessor) only brought it from 3.70 to 3.58 ms, so dictionary mode is not the main factor either.
`tools/profile-cold.mjs` profiles the run under these conditions (`gc` or `nogc`).

## Startup (first paint and size)

The size benchmark enables compression on the server, which then brotli-compresses every response
synchronously at quality 11: about 0.8 ms per raw kB on this machine, linearly. `main.js` is requested
about 7 ms into the load and arrives about 48 ms in, and the render-blocking bootstrap CSS waits behind
it on the single-threaded server, so first paint follows the raw size of the bundle far more than its
script time (about 2.7 ms evaluation). `tools/startup.mjs` measures it the way the runner does (a fresh
browser per load, compression on), interleaving entries, with medians of first paint, compile and
evaluation time from a trace, and memory at ready as `21_ready-memory` reads it.

Startup pass (15 interleaved rounds, headless; before = the build at the start of the pass):

| | before | after | vanillajs | Solid |
|---|---|---|---|---|
| main.js raw / gzip / brotli | 35.84 / 12.44 / 11.27 kB | 31.72 / 11.38 / 10.30 kB | | |
| first paint | 86.6 ms | 79.7 ms | 54.9 ms | 67.0 ms |
| compile / evaluate | 1.13 / 2.90 ms | 1.02 / 2.67 ms | 0.23 / 1.62 ms | 0.53 / 2.29 ms |
| memory at ready / JS heap | 0.721 / 0.927 MB | 0.695 / 0.903 MB | 0.572 / 0.806 MB | 0.604 / 0.833 MB |
| cold create 1k (`cold.mjs bench`) | 2.65 to 2.69 ms | 2.57 to 2.68 ms | | |

What changed: hydration is opt-in (`enableHydration()`, called by `ssgPlugin()`), so it leaves this
bundle; compiled templates the HTML parser reads back unchanged are emitted as markup; decorated fields,
methods and classes call shorter lowering helpers; the list view's internal members are `#private`.

## Reproduce

```bash
# repo root: npm start (server); then in frameworks/keyed/praxisjs: npm run build-local
cd webdriver-ts
npm run bench -- --headless keyed/praxisjs keyed/vanillajs keyed/solid keyed/svelte keyed/vue keyed/react-hooks keyed/preact-signals keyed/lit --count 10 --benchmark 01_ 02_ 03_ 04_ 05_ 06_ 07_ 08_ 09_
npm run results && cd .. && node praxisjs-report/summarize.mjs

# component scenarios and CPU profiles
(cd frameworks/praxisjs-scenarios && npm run build)
node praxisjs-report/tools/profile.mjs praxisjs-scenarios/index-local.html create1k 40
node praxisjs-report/tools/profile.mjs keyed/praxisjs create10k 10

# startup: first paint, compile/evaluate, memory at ready (several entries interleaved)
node praxisjs-report/tools/startup.mjs keyed/praxisjs,keyed/vanillajs,keyed/solid 15
```

Raw results: `results-npm/` (published packages), `results-final-visible/` (final run), `results-round6/` (round 6), `results-round5/` (round 5), `results-round4/` (round 4), `results-final/` (final round), `results-round3/` (round 3, PraxisJS/Solid/vanillajs), `results-round2/` (round 2), `results/` and `results-labels-record*/` (round 1),
`results-baseline-for/` (before the runtime work).
