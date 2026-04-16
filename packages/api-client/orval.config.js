const { defineConfig } = require("orval");

module.exports = defineConfig({
  api: {
    input: "./openapi.json",
    output: {
      mode: "single",
      target: "src/index.ts",
    },
  },
});
