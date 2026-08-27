import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "node_modules/**", "out/**"]),
  {
    rules: {
      // This experimental React Compiler rule flags setState calls inside
      // useEffect even for the canonical case of syncing client-only state
      // (localStorage, document.documentElement, window size) that cannot
      // be read during SSR/render. Every instance in this codebase is that
      // pattern, not the derived-state-from-props anti-pattern the rule
      // targets, so it's downgraded to a warning instead of rewritten.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
