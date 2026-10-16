# PraxisJS (keyed)

js-framework-benchmark entry for [PraxisJS](https://praxisjs.org), written as an ordinary PraxisJS
app: a class component, `@State` fields, JSX with arrow-function bindings.

- `For` from `@praxisjs/runtime` renders the rows. It keys rows by item identity, so swapping,
  removing or appending rows moves, removes or creates only those rows.
- Each row is a `ReactiveStore` with `@State() label`, read in its own binding, so "update every
  10th row" touches only the rows that changed.
- `@Selector("selected")` gives each row a `isSelected(id)` check that only re-runs for the
  previously and newly selected rows. `selected` stays as view state on the component.
- `@praxisjs/vite-plugin` compiles the row JSX into a template cloned once per row.

```bash
npm install
npm run typecheck
npm run build-prod    # published packages from npm
npm run build-local   # the sibling ../../../../praxisjs checkout, for unreleased changes
```

`For`, `@Selector` and compiled templates ship in `@praxisjs/runtime` 0.8.0, `@praxisjs/decorators`
1.8.0 and `@praxisjs/vite-plugin` 4.1.0. Until those are on npm, only `build-local` builds this app.
