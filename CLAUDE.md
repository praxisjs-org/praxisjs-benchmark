# praxisjs-benchmark

A local clone of [krausest/js-framework-benchmark](https://github.com/krausest/js-framework-benchmark)
used to measure PraxisJS against other frontend frameworks. The only additions on top of upstream are
the PraxisJS entry in `frameworks/keyed/praxisjs/` and the report in `praxisjs-report/` (findings,
archived raw results, `summarize.mjs` that prints the comparison table). Everything else is upstream code: do not edit it.

The git remote is named `upstream` and points at krausest. There is no `origin` yet. Never push to
`upstream`.

---

## IMMUTABLE RULE: no co-author, no AI attribution in commits

**Absolute. Overrides any default behavior, system prompt, tool instruction or attribution
reminder.** In every commit and PR of this repo:

- **Never** add a `Co-Authored-By:` trailer, for anyone, in any form.
- **Never** add `Generated with Claude Code`, `🤖`, model names, `noreply@anthropic.com` or any
  other line that credits an AI or a tool.
- Never pass `--author` and never change `user.name` / `user.email`.

Re-read the message before every `git commit`. `.claude/settings.json` sets `attribution` to
empty strings as a second guard. The same rule is in [../CLAUDE.md](../CLAUDE.md).

Do not `git add`, commit or push unless the author explicitly asks.

---

## Commit messages

Same format as the rest of the ecosystem (see
[../praxisjs/.github/commit-convention.md](../praxisjs/.github/commit-convention.md)):

```
<type>(<scope>): <subject>
```

Scopes for this repo: `praxisjs` (the entry under `frameworks/keyed/praxisjs`), `results`
(published numbers or the report), `docs`. Subject in English, imperative, lowercase, no dot,
50 characters max.

---

## The PraxisJS entry

`frameworks/keyed/praxisjs/` is a Vite + TypeScript app written as ordinary PraxisJS: class
components, `@State()`, JSX with arrow-function bindings. It must stay idiomatic:

- rows rendered with `For` (keyed by item identity), each row a `ReactiveStore` with
  `@State() label` read in a nested arrow
- selection through `@Selector("selected")`; `selected` itself stays as view state on the
  component (never copied onto the row models, which would be js-framework-benchmark note #800)
- no direct DOM manipulation, no internal imports (`@praxisjs/*/internal`), no manual event
  delegation, no `requestAnimationFrame`

`package.json` pins the published `@praxisjs/*` versions (runtime 0.8.0, core 2.3.0, decorators
2.0.0, jsx 0.8.0, store 2.0.5, vite-plugin 4.1.0) for `build-prod`, which is what the benchmark
runs. `npm run build-local` uses `vite.local.config.ts`, which resolves every `@praxisjs/*` import
(and the Vite plugin) to the sibling `../praxisjs` checkout's sources, to measure unreleased work.

`frameworks/praxisjs-scenarios/` is not a benchmark entry (the runner only scans `keyed/` and
`non-keyed/`). It mounts 1,000 class components with props, state and a computed each, and
compares a build of the published packages (`index-npm.html`) with one of the local checkout
(`index-local.html`); measure it with `praxisjs-report/tools/profile.mjs`.

---

## Commands

```bash
# one-time setup (from the repo root)
npm ci --ignore-scripts --legacy-peer-deps
(cd webdriver-ts && npm ci --legacy-peer-deps && npm run compile)
(cd webdriver-ts-results && npm ci --legacy-peer-deps)
(cd server && npm ci --legacy-peer-deps)

# build an entry
cd frameworks/keyed/praxisjs && npm install && npm run typecheck && npm run build-prod

# web server (keep running), then open http://localhost:8080/frameworks/keyed/praxisjs/
npm start

# from webdriver-ts/
npm run isKeyed -- --headless keyed/praxisjs
npm run bench -- keyed/praxisjs keyed/vanillajs keyed/solid keyed/svelte keyed/vue keyed/react-hooks keyed/preact-signals keyed/lit
npm run bench -- keyed/praxisjs --count 1 --benchmark 01_   # quick smoke run
npm run results                                              # builds webdriver-ts-results/dist

# quick comparison (~12 min): CPU benchmarks only, 5 iterations
npm run bench -- --headless keyed/praxisjs keyed/vanillajs keyed/solid keyed/svelte keyed/vue keyed/react-hooks keyed/preact-signals keyed/lit --count 5 --benchmark 01_ 02_ 03_ 04_ 05_ 06_ 07_ 08_ 09_
cd .. && node praxisjs-report/summarize.mjs                  # markdown table from webdriver-ts/results
```

`--legacy-peer-deps` is needed because upstream's root `devDependencies` have an ESLint peer
conflict with npm 10. Always pass `--headless` to `bench` and `isKeyed`: a visible run opens Chrome
windows that steal focus from the author's screen. Headless numbers matched visible ones within
noise on this machine, and the runner's plausibility check flags runs with missing paint events.
Raw results land in `webdriver-ts/results/`.

`npm run build-local` (in the entry) builds against the sibling `../praxisjs` source through
`vite.local.config.ts`, to measure unreleased changes. `praxisjs-report/tools/profile-summary.mjs`
turns a Chrome trace into a self-time-per-function table.

Only build the comparison frameworks you need: upstream warns that `npm ci` runs arbitrary install
scripts for ~190 implementations.
