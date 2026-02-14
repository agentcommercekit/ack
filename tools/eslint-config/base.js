// @ts-check

import cspell from "@cspell/eslint-plugin/configs"
import js from "@eslint/js"
import json from "@eslint/json"
import markdown from "@eslint/markdown"
import prettier from "eslint-config-prettier"
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript"
import importX from "eslint-plugin-import-x"
import turbo from "eslint-plugin-turbo"
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"

/**
 * @param {{ root: string }} options
 */
export function config({ root }) {
  const tsconfigPath = `${root}/tsconfig.json`

  return defineConfig(
    {
      ignores: ["dist/**", ".wrangler/**"],
    },

    /**
     * Spell checking
     */
    {
      // @ts-expect-error - cspell.recommended is not a valid extends element
      extends: [cspell.recommended],
      settings: {
        cspell: {
          configFile: "../../cspell.config.yaml",
        },
      },
    },

    /**
     * Markdown files
     */
    {
      extends: [markdown.configs.recommended],
      files: ["**/*.md"],
      language: "markdown/gfm",
    },

    /**
     * JSON files
     */
    {
      extends: [json.configs.recommended],
      files: ["**/*.json"],
      language: "json/json",
    },

    /**
     * Javascript, Typescript files
     */
    {
      files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
      extends: [
        js.configs.recommended,
        tseslint.configs.strictTypeChecked,
        tseslint.configs.stylisticTypeChecked,
        importX.flatConfigs.recommended,
        importX.flatConfigs.typescript,
      ],
      settings: {
        "import-x/resolver-next": [
          createTypeScriptImportResolver({
            project: tsconfigPath,
          }),
        ],
      },
      rules: {
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/consistent-type-imports": [
          "warn",
          {
            prefer: "type-imports",
            fixStyle: "separate-type-imports", // Enforces: import type { Foo } (top-level)
          },
        ],
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: false,
          },
        ],
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
        "@typescript-eslint/restrict-template-expressions": ["off"],
        // Disabled: Redundant with @typescript-eslint/consistent-type-imports
        "import-x/consistent-type-specifier-style": "off",
        // Disabled: Handled by @ianvs/prettier-plugin-sort-imports
        "import-x/order": "off",
        // Disabled: Handled by @ianvs/prettier-plugin-sort-imports
        "sort-imports": "off",
      },
    },

    {
      files: ["**/*.md/*.{js,ts}"],
      extends: [
        markdown.configs.processor,
        tseslint.configs.disableTypeChecked,
      ],
    },

    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: root,
          warnOnUnsupportedTypeScriptVersion: false,
        },
      },
    },

    /**
     * Turbo (Monorepo)
     */
    {
      plugins: {
        turbo,
      },
      rules: {
        "turbo/no-undeclared-env-vars": "off",
      },
    },

    /**
     * Test files
     */
    {
      files: ["**/*.test.*"],
      rules: {
        "@cspell/spellchecker": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
      },
    },

    /**
     * Javascript files
     *
     * Ignore type-checking
     */
    {
      files: ["**/*.js"],
      extends: [tseslint.configs.disableTypeChecked],
    },

    /**
     * Disable rules that could conflict with prettier.
     * This should be the last rule.
     */
    prettier,
  )
}
