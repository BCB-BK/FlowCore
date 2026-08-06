// ESLint — statische Analyse jenseits der Formatierung (Audit-Befund B3).
//
// Prettier prueft nur das Aussehen. Diese Konfiguration zielt auf Fehlerklassen,
// die im Betrieb weh tun: vergessene await, verschluckte Promises in
// Express-Handlern, unsichere Vergleiche. Bewusst schlank gehalten -- lieber
// wenige Regeln, die immer gruen sein muessen, als viele als Warnung.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.pnpm/**",
      "lib/api-zod/src/generated/**",
      "lib/api-client-react/src/generated/**",
      "**/build.mjs",
      "**/*.config.js",
      "**/*.config.ts",
      "**/*.cjs",
      "**/vite.config.*",
      "**/tailwind.config.*",
      "**/postcss.config.*",
      // Playwright-Bericht ist ein Build-Artefakt, kein Quellcode.
      "e2e/playwright-report/**",
      "e2e/test-results/**",
      // Audio-Worklets laufen im Browser-Worker und haengen an keinem tsconfig.
      "lib/integrations-openai-ai-react/src/audio/*.js",
      // Bewusst ausserhalb von rootDir (greift quer auf lib/shared zu),
      // deshalb nicht Teil des scripts-tsconfig.
      "scripts/src/export-page-types.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // --- die eigentlich wichtigen Regeln ---------------------------------
      // Ein nicht abgewartetes Promise in einem Express-Handler fuehrt zu
      // stillen Fehlern und haengenden Anfragen.
      "@typescript-eslint/no-floating-promises": "error",
      // checksVoidReturn aus: Express 5 leitet Fehler aus async-Handlern selbst
      // an den Error-Handler weiter, und React-Eventhandler duerfen async sein.
      // Die Regel wuerde sonst 112-mal korrekten Code anmahnen.
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: false },
      ],
      "@typescript-eslint/await-thenable": "error",
      // any hebelt die Typpruefung aus, auf die dieses Projekt sonst baut.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // Ungenutzte Variablen verstecken echte Fehler; fuehrende Unterstriche
      // bleiben als bewusste Auslassung erlaubt.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      eqeqeq: ["error", "smart"],
      "no-console": "off",
      // Vom Typpruefer bereits abgedeckt oder im Bestand zu laut:
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      // Express-Typerweiterung (declare global { namespace Express }) laesst
      // sich nicht ohne namespace ausdruecken -- so sieht sie die Bibliothek vor.
      "@typescript-eslint/no-namespace": "off",
      // Aus: Bei Bibliotheken, die `unknown` zurueckgeben (z. B. bpmn-js
      // modeler.get()), haelt die Regel notwendige Zusicherungen faelschlich
      // fuer ueberfluessig — ihr Autofix hat den Typcheck gebrochen.
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      // Zeichenkettenbildung aus Objekten: im Bestand fast ausschliesslich in
      // Log- und Fehlertexten, wo das Ergebnis akzeptabel ist.
      "@typescript-eslint/no-base-to-string": "off",
      // Leere Bloecke sind hier durchweg bewusste "Fehler ignorieren"-Stellen.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["artifacts/wiki-frontend/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Fehlende Abhaengigkeiten in useEffect erzeugen veraltete Daten in der
      // Oberflaeche. Im Bestand gibt es begruendete Ausnahmen, die im Code
      // bereits mit eslint-disable markiert sind -- diese Marken waren bisher
      // wirkungslos, weil die Regel gar nicht geladen wurde.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // Tests duerfen lockerer sein.
    files: ["**/__tests__/**", "**/*.test.ts", "e2e/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);
