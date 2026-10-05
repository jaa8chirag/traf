import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  // Module boundaries (docs/ARCHITECTURE.md §2): import a module only via its index.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/modules/*/*"], message: "Import from the module root (@/modules/<name>), not its internals." },
          ],
        },
      ],
    },
  },
  // UI layers must not touch the database directly; go through a module service.
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/modules/*/*"], message: "Import from the module root (@/modules/<name>), not its internals." },
            { group: ["@/lib/db", "@/generated/**"], message: "UI code must call module services, not Prisma." },
          ],
        },
      ],
    },
  },
  globalIgnores([
    "src/generated/**",
    "workers/*.cjs",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
