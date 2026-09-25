// End-to-end rounds against the running Chain simulator (`npm start` in casino-sdk):
// approve → openSession → local VRF node fulfils → CasinoSessionSettled. Tallies payout
// multipliers so the top-multiplier path is exercised on a real chain, not just in unit tests.
import {
  type Address,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  http,
  maxUint256,
  parseAbi,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';

const RPC_URL = 'http://127.0.0.1:8545';
const DEPLOYMENT_URL = 'http://localhost:3300/__local-contracts.json';
// Hardhat/Anvil default account #0 — public dev key, local chain only.
const DEV_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const BET_BACK_CHICKEN = 0;
const PRESENTATION_VERSION = 1;
const FIGHTER_INDEX = 2;
const WAGER = parseEther('1');
const SETTLE_TIMEOUT_MS = 30_000;
const POLL_MS = 500;

const hostAbi = parseAbi([
  'function openSession(address game, address vault, uint256 wager, bytes gameData) returns (uint256, bytes32)',
  'event CasinoSessionSettled(uint256 indexed sessionId, address indexed game, address indexed player, uint8 terminalPhase, uint256 payout, bytes32 randomness, bytes gameState)',
]);
const tokenAbi = parseAbi(['function approve(address spender, uint256 amount) returns (bool)']);

type Deployment = {
  host: Address;
  vault: Address;
  token: Address;
  games: { name: string; address: Address }[];
};

async function main(): Promise<void> {
  const rounds = Number(process.argv[2] ?? 40);
  const deployment = (await (await fetch(DEPLOYMENT_URL)).json()) as Deployment;
  const game = deployment.games.find((entry) => entry.name === 'RuckusGame')?.address;
  if (!game)
    throw new Error('RuckusGame is not deployed — run `pnpm -F @arena/contracts sync` first');

  const account = privateKeyToAccount(DEV_PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: hardhat, transport: http(RPC_URL) });
  const wallet = createWalletClient({ account, chain: hardhat, transport: http(RPC_URL) });

  await publicClient.waitForTransactionReceipt({
    hash: await wallet.writeContract({
      address: deployment.token,
      abi: tokenAbi,
      functionName: 'approve',
      args: [deployment.host, maxUint256],
    }),
  });

  const fromBlock = await publicClient.getBlockNumber();
  const gameData = encodeAbiParameters(
    [{ type: 'uint8' }, { type: 'uint8' }, { type: 'bytes' }],
    [
      BET_BACK_CHICKEN,
      PRESENTATION_VERSION,
      encodeAbiParameters([{ type: 'uint8' }], [FIGHTER_INDEX]),
    ],
  );
  for (let round = 0; round < rounds; round++) {
    await publicClient.waitForTransactionReceipt({
      hash: await wallet.writeContract({
        address: deployment.host,
        abi: hostAbi,
        functionName: 'openSession',
        args: [game, deployment.vault, WAGER, gameData],
      }),
    });
  }

  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  let settled: Awaited<
    ReturnType<typeof publicClient.getContractEvents<typeof hostAbi, 'CasinoSessionSettled'>>
  > = [];
  while (Date.now() < deadline) {
    settled = await publicClient.getContractEvents({
      address: deployment.host,
      abi: hostAbi,
      eventName: 'CasinoSessionSettled',
      args: { game },
      fromBlock,
    });
    if (settled.length >= rounds) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  const tally = new Map<string, number>();
  for (const event of settled) {
    const multiplier = `${Number(((event.args.payout ?? 0n) * 100n) / WAGER) / 100}×`;
    tally.set(multiplier, (tally.get(multiplier) ?? 0) + 1);
  }
  console.info(`settled ${settled.length}/${rounds} rounds`);
  for (const [multiplier, count] of [...tally].sort())
    console.info(`  ${multiplier.padStart(6)}  ${count}`);
  if (settled.length < rounds) process.exitCode = 1;
}

await main();
