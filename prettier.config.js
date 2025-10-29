/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
  plugins: [
    "@prettier/plugin-oxc", // must be first
    "@ianvs/prettier-plugin-sort-imports",
    "prettier-plugin-packagejson",
    "prettier-plugin-jsdoc"
  ],

  // General config
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "none",

  // @ianvs/prettier-plugin-sort-imports
  importOrderTypeScriptVersion: "5.0.0"
}

export default config
