const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const path = require("path");

const apiDir = __dirname;

module.exports = [
  {
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
    files: [path.join(apiDir, "src/**/*.ts").replace(/\\/g, "/")],
    ignores: ["**/*.spec.ts"],
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
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: [path.join(apiDir, "src/**/*.spec.ts").replace(/\\/g, "/")],
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
