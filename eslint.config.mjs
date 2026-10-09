import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A leading underscore marks a binding kept on purpose (a positional
      // argument, a destructured slot) but not read.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      // Wallet, RPC and contract results are handled untyped throughout the
      // network providers; typing them is its own piece of work.
      "@typescript-eslint/no-explicit-any": "off",
      // React Compiler diagnostics. The app does not build with the compiler,
      // and these flag its established patterns: an effect that resets state
      // before a fetch, a ref holding the latest callback, written during
      // render, and a callback memoized on a wallet's fields rather than the
      // whole wallet object.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // Plain <img> on purpose: index and token images are URLs on any host
      // (an index's creator picks its image), and QR codes and image previews
      // are data URLs; next/image would need every remote host listed.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "public/**",
    "next-env.d.ts",
  ]),
]);
