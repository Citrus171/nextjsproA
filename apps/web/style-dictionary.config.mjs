import StyleDictionary from "style-dictionary";

const sd = new StyleDictionary({
  source: ["design-tokens/**/*.json"],
  hooks: {
    formats: {
      "css/tailwind-variables": ({ dictionary }) => {
        const vars = dictionary.allTokens
          .map((t) => `    --${t.name}: ${t.value};`)
          .join("\n");
        return [
          "@tailwind base;",
          "@tailwind components;",
          "@tailwind utilities;",
          "",
          "@layer base {",
          "  :root {",
          vars,
          "  }",
          "}",
          "",
          "@layer base {",
          "  * {",
          "    @apply border-border;",
          "  }",
          "  html,",
          "  body {",
          "    overflow-x: hidden;",
          "  }",
          "}",
          "",
        ].join("\n");
      },
    },
  },
  platforms: {
    css: {
      transforms: ["name/kebab"],
      buildPath: "src/styles/",
      files: [{ destination: "globals.css", format: "css/tailwind-variables" }],
    },
  },
});

await sd.buildAllPlatforms();
