import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    ignores: ["cdk.out/**", "dist/**", "node_modules/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      ...tseslint.configs["recommended-type-checked"].rules,
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/require-await": "off"
    }
  },
  {
    files: ["test/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off"
    }
  }
];
