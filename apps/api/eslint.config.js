const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const path = require("path");

const apiDir = __dirname;

module.exports = [
  {
    name: "global",
    files: ["**/*.ts"],
    ignores: ["**/node_modules/**", "**/dist/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    name: "src",
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: path.join(apiDir, "tsconfig.json"),
        tsconfigRootDir: apiDir,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      complexity: ["warn", { max: 7 }],
      "@typescript-eslint/no-floating-promises": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    name: "spec",
    files: ["src/**/*.spec.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: path.join(apiDir, "tsconfig.json"),
        tsconfigRootDir: apiDir,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
