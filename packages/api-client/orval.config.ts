import { defineConfig } from "orval";
export default defineConfig({
  api: {
    input: "./openapi.json",
    output: {
      mode: "single",
      target: "src/index.ts",
    },
  },
});
