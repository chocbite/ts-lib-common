import { defineConfig } from "tsdown";

export default defineConfig({
  sourcemap: "inline",
  deps: { neverBundle: true },
});
