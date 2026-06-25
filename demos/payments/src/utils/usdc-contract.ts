import {
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  http,
  isHash,
  type Account,
  type Address,
  type Hash,
} from "viem"

import { chain, usdcAddress } from "@/constants"

/**
 * Transfer USDC to the recipient
 *
 * @param fromAccount - The account to transfer from
 * @param toAddress - The address to transfer to
 * @param amount - The amount to transfer
 * @returns The hash of the transaction
 */
export async function transferUsdc(
  fromAccount: Account,
  toAddress: Address,
  amount: bigint,
): Promise<Hash> {
  // If you'd like to bypass actual transactions on subsequent runs with the same
  // client wallet to the same server, you can set the SIMULATED_PAYMENT_TX_HASH
  // environment variable to the hash of a previously sent transaction.
  const simulatedHash = process.env.SIMULATED_PAYMENT_TX_HASH
  if (simulatedHash) {
    if (!isHash(simulatedHash)) {
      throw new Error(
        "SIMULATED_PAYMENT_TX_HASH is not a valid transaction hash",
      )
    }
    return simulatedHash
  }

  const walletClient = createWalletClient({
    chain,
    transport: http(),
    account: fromAccount,
  })

  return walletClient.sendTransaction({
    account: fromAccount,
    to: usdcAddress,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [toAddress, amount],
    }),
  })
}
