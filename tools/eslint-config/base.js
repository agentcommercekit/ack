// @ts-check

import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript"
import importX from "eslint-plugin-import-x"
import turbo from "eslint-plugin-turbo"
import markdown from "@eslint/markdown"
import tseslint from "typescript-eslint"
import json from "@eslint/json"
import cspell from "@cspell/eslint-plugin/configs"

export function config({ root }) {
  const tsconfigPath = `${root}/tsconfig.json`

  return tseslint.config(
    {
      ignores: ["dist/**", ".wrangler/**"]
    },

    /**
     * Spell checking
     */
    {
      extends: [cspell.recommended],
      settings: {
        cspell: {
          configFile: "../../cspell.config.yaml"
        }
      }
    },

    /**
     * Markdown files
     */
    {
      extends: [markdown.configs.recommended],
      files: ["**/*.md"],
      language: "markdown/gfm"
    },

    /**
     * JSON files
     */
    {
      extends: [json.configs.recommended],
      files: ["**/*.json"],
      language: "json/json"
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
        importX.flatConfigs.typescript
      ],
      settings: {
        "import-x/resolver-next": [
          createTypeScriptImportResolver({
            project: tsconfigPath
          })
        ]
      },
      rules: {
        "@typescript-eslint/consistent-type-definitions": "off",
        "@typescript-eslint/consistent-type-imports": [
          "warn",
          { prefer: "type-imports" }
        ],
        "@typescript-eslint/no-misused-promises": [
          "error",
          {
            checksVoidReturn: false
          }
        ],
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_"
          }
        ],
        "@typescript-eslint/restrict-template-expressions": ["off"],
        "import-x/consistent-type-specifier-style": [
          "warn",
          "prefer-top-level"
        ],
        "import-x/order": [
          "warn",
          {
            "newlines-between": "never",
            groups: [
              "builtin",
              "external",
              "internal",
              ["sibling", "parent"],
              "index",
              "object",
              "type"
            ],
            alphabetize: {
              order: "asc"
            }
          }
        ],
        "sort-imports": [
          "warn",
          {
            ignoreDeclarationSort: true
          }
        ]
      }
    },

    {
      files: ["**/*.md/*.{js,ts}"],
      extends: [markdown.configs.processor, tseslint.configs.disableTypeChecked]
    },

    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          warnOnUnsupportedTypeScriptVersion: false
        }
      }
    },

    /**
     * Turbo (Monorepo)
     */
    {
      plugins: {
        turbo
      },
      rules: {
        "turbo/no-undeclared-env-vars": "off"
      }
    },

    /**
     * Test files
     */
    {
      files: ["**/*.test.*"],
      rules: {
        "@cspell/spellchecker": "off",
        "@typescript-eslint/no-non-null-assertion": "off"
      }
    },

    /**
     * Javascript files
     *
     * Ignore type-checking
     */
    {
      files: ["**/*.js"],
      extends: [tseslint.configs.disableTypeChecked]
    },

    /**
     * Disable rules that could conflict with prettier.
     * This should be the last rule.
     */
    prettier
  )
}
