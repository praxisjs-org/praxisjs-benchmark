import { defineConfig } from "vite";
import { praxisjs } from "@praxisjs/vite-plugin";

export default defineConfig({
  plugins: [praxisjs({ hmr: false })],
  oxc: { jsx: { importSource: "@praxisjs/jsx" }, target: "es2022" },
  build: {
    outDir: "dist-npm",
    rollupOptions: { input: "src/main.tsx", output: { entryFileNames: "main.js" } },
  },
});
