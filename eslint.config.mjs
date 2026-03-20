import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      // Enforce no-any (TypeScript strict)
      "@typescript-eslint/no-explicit-any": "error",
      // Enforce consistent type imports
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      // Disallow unused variables
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Enforce async/await over .then() chains
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='then']",
          message: "Use async/await instead of .then() chains.",
        },
      ],
    },
  },
];

export default eslintConfig;
