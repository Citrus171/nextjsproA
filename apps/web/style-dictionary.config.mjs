import StyleDictionary from "style-dictionary";

function hexToHsl(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const sd = new StyleDictionary({
  source: ["design-tokens/tokens.json"],
  hooks: {
    transforms: {
      "color/hsl": {
        type: "value",
        filter: (token) =>
          token.type === "color" && token.value.startsWith("#"),
        transform: (token) => hexToHsl(token.value),
      },
    },
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
      transforms: ["name/kebab", "color/hsl"],
      buildPath: "src/styles/",
      files: [{ destination: "globals.css", format: "css/tailwind-variables" }],
    },
  },
});

await sd.buildAllPlatforms();
