/**
 * Connector Registration — registers all connectors to the global SourceRegistry
 * Called once at application startup.
 */
import { sourceRegistry, sourceMapper } from "../source-registry.js";
import { DefiLlamaConnector, DefiLlamaProtocolConnector } from "./defillama-connector.js";
import { PythConnector } from "./pyth-connector.js";
import { SwitchboardConnector } from "./switchboard-connector.js";
import { MagicEdenConnector } from "./magic-eden-connector.js";
import { TensorConnector } from "./tensor-connector.js";
import { JupiterConnector } from "./jupiter-connector.js";
import { DexScreenerConnector } from "./dexscreener-connector.js";
import { BirdeyeConnector } from "./birdeye-connector.js";
import { CoinGeckoConnector } from "./coingecko-connector.js";
import { HeliusConnector } from "./helius-connector.js";
import { ChainlinkConnector } from "./chainlink-connector.js";
import { DiaConnector } from "./dia-connector.js";
import { HyperspaceConnector } from "./hyperspace-connector.js";
import { SolanartConnector } from "./solanart-connector.js";
import { SolanaRpcConnector } from "./solana-rpc-connector.js";
import { SolanaComDataConnector } from "./solana-com-data-connector.js";
import { SolanaFloorConnector } from "./solanafloor-connector.js";
import { TwitterRssConnector } from "./twitter-rss-connector.js";
import { DuneAnalyticsConnector } from "./dune-analytics-connector.js";

let registered = false;

export function registerAllConnectors(): void {
  if (registered) return;
  registered = true;

  // Existing connectors
  sourceRegistry.register(new DefiLlamaConnector());
  sourceRegistry.register(new DefiLlamaProtocolConnector());
  sourceRegistry.register(new PythConnector());
  sourceRegistry.register(new SwitchboardConnector());
  sourceRegistry.register(new MagicEdenConnector());
  sourceRegistry.register(new TensorConnector());
  sourceRegistry.register(new JupiterConnector());
  sourceRegistry.register(new DexScreenerConnector());
  sourceRegistry.register(new BirdeyeConnector());

  // New connectors — Phase 2
  sourceRegistry.register(new CoinGeckoConnector());
  sourceRegistry.register(new HeliusConnector());
  sourceRegistry.register(new ChainlinkConnector());
  sourceRegistry.register(new DiaConnector());
  sourceRegistry.register(new HyperspaceConnector());
  sourceRegistry.register(new SolanartConnector());
  sourceRegistry.register(new SolanaRpcConnector());

  // V3 connectors — contest requirements
  sourceRegistry.register(new SolanaComDataConnector());
  sourceRegistry.register(new SolanaFloorConnector());
  sourceRegistry.register(new TwitterRssConnector());
  sourceRegistry.register(new DuneAnalyticsConnector());

  // Register custom source mappings for IDs that don't match automatic patterns
  // chainlink-solana → chainlink (not -api suffix, direct pattern doesn't match)
  sourceMapper.registerMapping("chainlink-solana", "chainlink");
  // quicknode-rpc, triton-rpc → solana-rpc (fallback if no dedicated connector)
  sourceMapper.registerMapping("quicknode-rpc", "solana-rpc");
  sourceMapper.registerMapping("triton-rpc", "solana-rpc");
  // metaplex-rpc → solana-rpc (Metaplex uses standard Solana RPC)
  sourceMapper.registerMapping("metaplex-rpc", "solana-rpc");
  // raydium-api → dexscreener (provides Raydium pair data)
  sourceMapper.registerMapping("raydium-api", "dexscreener", { pairAddress: "" });
  // NOTE: The following source IDs remain intentionally unresolved because
  // their connectors don't exist yet and cannot be faked:
  // - drift-api, jito-api, wormhole-api, pump-fun-api, sns-api
  //   (project-specific APIs that need dedicated connectors)
  // - anchor-github, solana-cli-github, sugar-github, metaplex-github
  //   (GitHub repos — metadata sources that don't need a connector)
}
