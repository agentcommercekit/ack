import { solana } from "@/constants"
import { colors, log, waitForEnter } from "@repo/cli-tools"
import { createSolanaRpc, address as solAddress } from "@solana/kit"
import { createPublicClient, erc20Abi, http, type Chain } from "viem"
import { formatUnits } from "viem/utils"

/**
 * Ensure the client wallet has a non-zero balance of USDC and ETH
 */
export async function ensureNonZeroBalances(
  chain: Chain,
  address: `0x${string}`,
  usdcAddress: `0x${string}`,
) {
  let balanceUsdc = await getErc20Balance(chain, address, usdcAddress)
  let balanceEth = await getEthBalance(chain, address)

  while (balanceUsdc.value === BigInt(0)) {
    log(
      "We need to fund this address with testnet USDC and testnet ETH:",
      address,
    )
    log(
      "You can get testnet tokens from the following faucets:",
      "ETH: https://docs.base.org/chain/network-faucets",
      "USDC: https://faucet.circle.com/",
    )
    log("Once funded, press enter to check balance again")
    await waitForEnter()
    log(colors.dim("Fetching balances..."))
    balanceUsdc = await getErc20Balance(chain, address, usdcAddress)
    balanceEth = await getEthBalance(chain, address)
  }

  log("Client wallet balances:")
  log("  USDC: ", formatUnits(balanceUsdc.value, balanceUsdc.decimals))
  log("   ETH: ", formatUnits(balanceEth.value, balanceEth.decimals))

  return { balanceUsdc, balanceEth }
}

export async function ensureSolanaSolBalance(address: string): Promise<bigint> {
  const rpc = createSolanaRpc(solana.rpcUrl)
  const pubkey = solAddress(address)

  async function fetchBalance(): Promise<bigint> {
    try {
      const balance = await rpc
        .getBalance(pubkey, { commitment: solana.commitment })
        .send()
      return balance.value
    } catch {
      return 0n
    }
  }

  let lamports = await fetchBalance()

  while (lamports === 0n) {
    log("We need to fund this Solana address with devnet SOL:", address)
    log("Faucet: https://faucet.solana.com/")
    log("Once funded, press enter to check balance again")
    await waitForEnter()
    log(colors.dim("Fetching SOL balance..."))
    lamports = await fetchBalance()
  }

  log(colors.dim(`SOL balance (lamports): ${lamports}`))
  return lamports
}

async function getEthBalance(chain: Chain, address: `0x${string}`) {
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  })

  const balance = await publicClient.getBalance({
    address,
  })

  return {
    value: balance,
    decimals: 18,
  }
}

async function getErc20Balance(
  chain: Chain,
  address: `0x${string}`,
  contractAddress: `0x${string}`,
) {
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  })

  const [balance, decimals] = await publicClient.multicall({
    contracts: [
      {
        address: contractAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      },
      {
        address: contractAddress,
        abi: erc20Abi,
        functionName: "decimals",
      },
    ],
  })

  if (balance.status !== "success" || decimals.status !== "success") {
    throw new Error("Failed to fetch token data")
  }

  return {
    value: balance.result,
    decimals: decimals.result,
  }
}
