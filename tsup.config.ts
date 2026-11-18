import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  outDir: "lib",
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2019",
  external: ["react", "react-native"],
});
