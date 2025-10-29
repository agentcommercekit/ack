import { STATUS_LIST_MAX_SIZE } from "../schema"

/**
 * Get the position of a status list in the database
 *
 * @param statusListIndex - The index of the status list, 1-indexed
 * @returns The position of the status list in the database
 */
export function getStatusListPosition(statusListIndex: number) {
  // Ensure the index is a positive integer
  if (!Number.isInteger(statusListIndex) || statusListIndex < 1) {
    throw new Error(
      "Status list index must be a positive integer starting from 1",
    )
  }

  const zeroIndexed = statusListIndex - 1

  return {
    id: Math.floor(zeroIndexed / STATUS_LIST_MAX_SIZE),
    index: zeroIndexed % STATUS_LIST_MAX_SIZE,
  }
}
