import * as v from "valibot"

const idParamSchema = v.pipe(
  v.string(),
  v.regex(/^\d+$/),
  v.transform(Number),
  // A long digit string parses to an unsafe integer or `Infinity`, which would
  // reach the query.
  v.safeInteger(),
  v.minValue(0),
)

/**
 * Parse a row id out of a URL parameter.
 *
 * `parseInt` maps a parameter with no leading digits to `NaN`, which reaches
 * the query and fails it, and it stops at the first character it cannot read,
 * so `/1abc`, `/0x1` and `/1e3` all select row 1.
 *
 * @param value - The URL parameter to parse
 * @returns The id, or `undefined` if the parameter is not one
 */
export function parseIdParam(value: string): number | undefined {
  const result = v.safeParse(idParamSchema, value)

  return result.success ? result.output : undefined
}
