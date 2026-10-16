// Builds the entry against the sibling praxisjs checkout's source instead of the npm packages,
// to measure unreleased changes: `npm run build-local`. Expects ../../../../praxisjs to exist.
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { praxisjs } from "../../../../praxisjs/packages/dx/vite-plugin/src/index";

const pkg = (path: string) => fileURLToPath(new URL(`../../../../praxisjs/packages/${path}`, import.meta.url));

export default defineConfig({
  plugins: [praxisjs({ hmr: false })],
  resolve: {
    alias: [
      { find: /^@praxisjs\/core\/internal$/, replacement: pkg("foundation/core/src/internal.ts") },
      { find: /^@praxisjs\/core$/, replacement: pkg("foundation/core/src/index.ts") },
      { find: /^@praxisjs\/shared\/internal$/, replacement: pkg("foundation/shared/src/internal.ts") },
      { find: /^@praxisjs\/shared$/, replacement: pkg("foundation/shared/src/index.ts") },
      { find: /^@praxisjs\/decorators$/, replacement: pkg("foundation/decorators/src/index.ts") },
      { find: /^@praxisjs\/runtime$/, replacement: pkg("foundation/runtime/src/index.ts") },
      { find: /^@praxisjs\/jsx\/jsx-(dev-)?runtime$/, replacement: pkg("foundation/jsx/src/jsx-runtime.ts") },
      { find: /^@praxisjs\/jsx$/, replacement: pkg("foundation/jsx/src/index.ts") },
      { find: /^@praxisjs\/store$/, replacement: pkg("features/store/src/index.ts") },
    ],
  },
  oxc: {
    jsx: {
      importSource: "@praxisjs/jsx",
    },
    target: "es2022",
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "src/main.tsx",
      output: {
        entryFileNames: "main.js",
      },
    },
  },
});
