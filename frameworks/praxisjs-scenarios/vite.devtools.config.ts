// Scenarios app plus the locally built devtools panel, to try the panel by hand.
import { mergeConfig } from "vite";

import local from "../keyed/praxisjs/vite.local.config";

export default mergeConfig(local, {
  build: { outDir: "dist-devtools", rollupOptions: { input: "src/main-devtools.tsx" } },
});
