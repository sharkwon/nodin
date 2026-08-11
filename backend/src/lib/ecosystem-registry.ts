/**
 * ════════════════════════════════════════════════════════════════════════════
 * CANONICAL ECOSYSTEM PROJECT REGISTRY — SEED DATA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Hand-curated canonical registry of Solana ecosystem projects.
 * Every project has passed identity verification (website, docs, or GitHub).
 * This is the canonical source-of-truth — extensible at runtime via discovery.
 * ════════════════════════════════════════════════════════════════════════════
 */
import type { EcosystemProject, DataSource } from "./ecosystem-types.js";

// ── Helpers ──
function ds(
  id: string, provider: string, type: DataSource["type"],
  capabilities: string[], endpoint?: string,
  auth: DataSource["authentication"] = "none",
): DataSource {
  return { id, provider, type, capabilities, endpoint, authentication: auth, status: "unknown", lastCheckedAt: "" };
}

function proj(
  id: string, name: string, categories: EcosystemProject["categories"],
  opts: {
    website?: string; docs?: string; github?: string; twitter?: string;
    discord?: string; description?: string; logo?: string;
    status?: EcosystemProject["status"]; dataSources?: DataSource[];
    contracts?: EcosystemProject["contracts"]; token?: EcosystemProject["token"];
    aliases?: string[];
  } = {},
): EcosystemProject {
  const now = new Date().toISOString();
  return {
    id, name, slug: id, categories, chain: "solana",
    description: opts.description, website: opts.website, docs: opts.docs,
    github: opts.github, twitter: opts.twitter, discord: opts.discord,
    logo: opts.logo, status: opts.status ?? "active",
    verificationStage: "verified",
    dataSources: opts.dataSources ?? [],
    contracts: opts.contracts, token: opts.token, aliases: opts.aliases,
    discoveredAt: now, lastVerifiedAt: now, lastUpdated: now,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// DEX — SPOT & AGGREGATOR
// ════════════════════════════════════════════════════════════════════════════
const RAYDIUM = proj("raydium", "Raydium", ["dex", "defi"], {
  website: "https://raydium.io", docs: "https://docs.raydium.io",
  twitter: "https://twitter.com/RaydiumProtocol",
  description: "AMM and liquidity provider on Solana, integrated with OpenBook.",
  token: { symbol: "RAY", name: "Raydium" },
  aliases: ["Raydium Protocol", "Raydium LP"],
  dataSources: [
    ds("defillama-raydium", "DeFiLlama", "api", ["tvl", "volume", "fees"], "https://api.llama.fi"),
    ds("raydium-api", "Raydium", "api", ["pools", "farming", "swap"], "https://api.raydium.io/v2"),
  ],
});

const ORCA = proj("orca", "Orca", ["dex", "defi"], {
  website: "https://www.orca.so", docs: "https://docs.orca.so",
  twitter: "https://twitter.com/orca_so",
  description: "CLAMM (concentrated liquidity) DEX on Solana.",
  token: { symbol: "ORCA", name: "Orca" },
  aliases: ["Orca Whirlpools", "Orca SO"],
  dataSources: [ds("defillama-orca", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi")],
});

const METEORA = proj("meteora", "Meteora", ["dex", "defi", "yield"], {
  website: "https://meteora.ag", docs: "https://docs.meteora.ag",
  twitter: "https://twitter.com/MeteoraAG",
  description: "DLMM (dynamic liquidity market maker) and vault protocols.",
  token: { symbol: "MET", name: "Meteora" },
  aliases: ["Meteora AG", "Meteora DLMM"],
  dataSources: [ds("defillama-meteora", "DeFiLlama", "api", ["tvl", "volume", "fees"], "https://api.llama.fi")],
});

const PHOENIX = proj("phoenix", "Phoenix", ["dex", "defi"], {
  website: "https://phoenix.trade", docs: "https://docs.phoenix.trade",
  description: "High-performance on-chain order book DEX.",
  aliases: ["Phoenix Trade"],
  dataSources: [ds("defillama-phoenix", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi")],
});

const CROPPER = proj("cropper", "Cropper", ["dex", "defi"], {
  website: "https://cropper.finance",
  description: "AMM with dynamic concentration farming.",
  aliases: ["Cropper Finance"],
  dataSources: [ds("defillama-cropper", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

const LIFINITY = proj("lifinity", "Lifinity", ["dex", "defi", "oracle"], {
  website: "https://lifinity.io",
  description: "Oracle-based AMM using Pyth price feeds for rebalancing.",
  token: { symbol: "LFI", name: "Lifinity" },
  aliases: ["Lifinity V2"],
  dataSources: [ds("defillama-lifinity", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi")],
});

const SABER = proj("saber", "Saber", ["dex", "defi", "stablecoins"], {
  website: "https://saber.io", docs: "https://docs.saber.io",
  description: "Stablecoin and LP swap DEX.",
  token: { symbol: "SBR", name: "Saber" },
  aliases: ["Saber Labs"],
  dataSources: [ds("defillama-saber", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi")],
});

const CYKURA = proj("cykura", "Cykura", ["dex", "defi"], {
  website: "https://cykura.io", description: "Concentrated liquidity AMM.",
  aliases: ["Cykura Protocol"],
  dataSources: [ds("defillama-cykura", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

const SAROS = proj("saros", "Saros", ["dex", "defi"], {
  website: "https://saros.finance", description: "AMM and swap protocol.",
  token: { symbol: "SAROS", name: "Saros" }, aliases: ["Saros Finance"],
  dataSources: [ds("defillama-saros", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

const JUPITER = proj("jupiter", "Jupiter", ["dex_aggregator", "dex", "defi", "launchpad"], {
  website: "https://jup.ag", docs: "https://station.jup.ag",
  github: "https://github.com/jup-ag", twitter: "https://twitter.com/JupiterExchange",
  description: "Solana's primary swap aggregator and DEX infrastructure.",
  token: { symbol: "JUP", name: "Jupiter", mintAddress: "JUPyiWrYQdr6eUSFxYnLBHZW5K6yVw56g7vNaGRTQJL" },
  aliases: ["Jupiter Exchange", "JUP", "Jupiter Aggregator", "Jup.ag"],
  dataSources: [
    ds("defillama-jupiter", "DeFiLlama", "api", ["tvl", "volume", "fees"], "https://api.llama.fi"),
    ds("jupiter-api", "Jupiter", "api", ["swap_quote", "token_list", "price", "routing"], "https://quote-api.jup.ag/v6"),
    ds("jupiter-stats", "Jupiter Stats", "api", ["volume", "trades", "routing_stats"], "https://stats.jup.ag"),
  ],
});

// ════════════════════════════════════════════════════════════════════════════
// LENDING
// ════════════════════════════════════════════════════════════════════════════
const KAMINO = proj("kamino", "Kamino", ["lending", "defi", "yield"], {
  website: "https://kamino.finance", docs: "https://docs.kamino.finance",
  twitter: "https://twitter.com/KaminoFinance",
  description: "Lending, borrowing, and automated liquidity vaults.",
  token: { symbol: "KMNO", name: "Kamino" }, aliases: ["Kamino Finance"],
  dataSources: [ds("defillama-kamino", "DeFiLlama", "api", ["tvl", "fees"], "https://api.llama.fi")],
});

const MARGINFI = proj("marginfi", "marginfi", ["lending", "defi"], {
  website: "https://marginfi.com", docs: "https://docs.marginfi.com",
  twitter: "https://twitter.com/marginfi",
  description: "Cross-margin lending protocol with risk-adjusted borrowing.",
  token: { symbol: "MRGN", name: "marginfi" }, aliases: ["Marginfi", "Margin Finance", "mrgn"],
  dataSources: [ds("defillama-marginfi", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

const SOLEND = proj("solend", "Solend", ["lending", "defi"], {
  website: "https://solend.fi", docs: "https://docs.solend.fi",
  twitter: "https://twitter.com/solendprotocol",
  description: "Algorithmic lending protocol, one of Solana's earliest.",
  token: { symbol: "SLND", name: "Solend" }, aliases: ["Solend Protocol"],
  dataSources: [ds("defillama-solend", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

const FRAKT = proj("frakt", "Frakt", ["lending", "nft"], {
  website: "https://frakt.finance", description: "NFT-backed lending and fractionalization.",
  aliases: ["Frakt Finance"],
  dataSources: [ds("defillama-frakt", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

const BANX = proj("banx", "Banx", ["lending", "nft"], {
  website: "https://banx.xyz", twitter: "https://twitter.com/banxxyz",
  description: "NFT-backed lending protocol with fixed-term loans.",
  aliases: ["Banx XYZ"],
  dataSources: [ds("defillama-banx", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

const SHARKY = proj("sharky", "Sharky", ["lending", "nft"], {
  website: "https://www.sharky.lol", description: "NFT-backed peer-to-peer lending.",
  aliases: ["Sharky App"],
  dataSources: [ds("defillama-sharky", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

// ════════════════════════════════════════════════════════════════════════════
// PERPETUALS / DERIVATIVES / OPTIONS
// ════════════════════════════════════════════════════════════════════════════
const DRIFT = proj("drift", "Drift", ["perpetuals", "derivatives", "defi"], {
  website: "https://www.drift.trade", docs: "https://docs.drift.trade",
  twitter: "https://twitter.com/DriftProtocol",
  description: "On-chain perpetual futures and spot trading with JIT auction.",
  token: { symbol: "DRIFT", name: "Drift" }, aliases: ["Drift Protocol", "Drift Trade"],
  dataSources: [
    ds("defillama-drift", "DeFiLlama", "api", ["tvl", "volume", "fees"], "https://api.llama.fi"),
    ds("drift-api", "Drift", "api", ["perp_markets", "funding_rates", "open_interest"], "https://api.drift.trade"),
  ],
});

const ZETA = proj("zeta", "Zeta Markets", ["perpetuals", "derivatives", "defi"], {
  website: "https://www.zeta.markets", docs: "https://docs.zeta.markets",
  twitter: "https://twitter.com/zeta_markets",
  description: "Perpetual and options DEX with order book model.",
  token: { symbol: "ZEX", name: "Zeta Markets" }, aliases: ["Zeta", "ZEX"],
  dataSources: [ds("defillama-zeta", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi")],
});

const PARITY = proj("parity", "Parity", ["perpetuals", "derivatives", "defi"], {
  website: "https://parity.fi", description: "Perpetual DEX with off-chain matching.",
  aliases: ["Parity Fi"],
  dataSources: [ds("defillama-parity", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi")],
});

const GULF_STREAM = proj("gulf-stream", "Gulf Stream", ["perpetuals", "derivatives", "defi"], {
  website: "https://gulfstream.xyz",
  description: "Perpetual futures protocol by Hxro Network.",
  aliases: ["Gulf Stream Labs", "Hxro Gulf Stream"],
  dataSources: [ds("defillama-gulf-stream", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi")],
});

const PSYOPTIONS = proj("psyoptions", "PsyOptions", ["options", "derivatives", "defi"], {
  website: "https://psyoptions.io", docs: "https://docs.psyoptions.io",
  github: "https://github.com/psyoptions",
  description: "Options protocol using the Port-Delta framework on Solana.",
  aliases: ["PsyOptions", "Psy Finance", "PSY"],
  dataSources: [ds("defillama-psyoptions", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

// ════════════════════════════════════════════════════════════════════════════
// STABLECOINS
// ════════════════════════════════════════════════════════════════════════════
const USDC = proj("usdc-solana", "USD Coin", ["stablecoins", "defi", "payments"], {
  website: "https://www.circle.com/en/USDC",
  description: "Circle-issued USDC stablecoin on Solana.",
  token: { symbol: "USDC", name: "USD Coin", mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
  aliases: ["USDC", "Circle USDC"],
  dataSources: [ds("defillama-usdc", "DeFiLlama", "api", ["supply", "price"], "https://stablecoins.llama.fi")],
});

const USDT = proj("usdt-solana", "Tether USD", ["stablecoins", "defi"], {
  website: "https://tether.to", description: "Tether-issued USDT stablecoin on Solana.",
  token: { symbol: "USDT", name: "Tether USD", mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkYqMcgtMJZ9ZfFzB" },
  aliases: ["USDT", "Tether"],
  dataSources: [ds("defillama-usdt", "DeFiLlama", "api", ["supply", "price"], "https://stablecoins.llama.fi")],
});

const PYUSD = proj("pyusd-solana", "PayPal USD", ["stablecoins", "defi", "payments"], {
  website: "https://www.paypal.com", description: "PayPal-issued PYUSD stablecoin on Solana.",
  token: { symbol: "PYUSD", name: "PayPal USD", mintAddress: "2b1kV6DkPAnxd5ixfnExgL2z37YDfBlF3q7T4LpG3p7v" }, aliases: ["PYUSD", "PayPal USD"],
  dataSources: [ds("defillama-pyusd", "DeFiLlama", "api", ["supply", "price"], "https://stablecoins.llama.fi")],
});

// ════════════════════════════════════════════════════════════════════════════
// YIELD & VAULTS
// ════════════════════════════════════════════════════════════════════════════
const TULIP = proj("tulip", "Tulip", ["yield", "defi"], {
  website: "https://tulip.garden", description: "Yield aggregation and auto-compounding vaults.",
  token: { symbol: "TULIP", name: "Tulip" }, aliases: ["Tulip Garden"],
  dataSources: [ds("defillama-tulip", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

const FRANCIUM = proj("francium", "Francium", ["yield", "defi", "lending"], {
  website: "https://francium.io", description: "Leveraged yield farming and lending protocol.",
  token: { symbol: "FRN", name: "Francium" }, aliases: ["Francium Protocol"],
  dataSources: [ds("defillama-francium", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

// ════════════════════════════════════════════════════════════════════════════
// LIQUID STAKING
// ════════════════════════════════════════════════════════════════════════════
const JITO = proj("jito", "Jito", ["liquid_staking", "defi", "infrastructure", "validator"], {
  website: "https://www.jito.network", docs: "https://docs.jito.network",
  github: "https://github.com/jito-labs", twitter: "https://twitter.com/jito_labs",
  description: "Liquid staking with MEV extraction, JitoSOL LST.",
  token: { symbol: "JITOSOL", name: "Jito Staked SOL", mintAddress: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn" },
  aliases: ["Jito Labs", "JitoSOL", "Jito Network"],
  dataSources: [
    ds("defillama-jito", "DeFiLlama", "api", ["tvl", "stake"], "https://api.llama.fi"),
    ds("jito-api", "Jito", "api", ["stake", "mev", "validator"], "https://kobe.mainnet.jito.network/api/v1"),
  ],
});

const MARINADE = proj("marinade", "Marinade Finance", ["liquid_staking", "defi"], {
  website: "https://marinade.finance", docs: "https://docs.marinade.finance",
  twitter: "https://twitter.com/MarinadeFinance",
  description: "Liquid staking protocol, mSOL LST.",
  token: { symbol: "mSOL", name: "Marinade SOL", mintAddress: "mSoLzYCxHdYgdzU16g5QSh3MU5dXRBZhA7gQq5y9bXf" },
  aliases: ["Marinade", "mSOL"],
  dataSources: [ds("defillama-marinade", "DeFiLlama", "api", ["tvl", "stake"], "https://api.llama.fi")],
});

const BLAZESTAKE = proj("blazestake", "BlazeStake", ["liquid_staking", "defi"], {
  website: "https://blazestake.org", description: "Liquid staking protocol, bSOL LST.",
  token: { symbol: "bSOL", name: "BlazeStake SOL" }, aliases: ["BlazeStake", "Blaze Staking"],
  dataSources: [ds("defillama-blazestake", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

const SANCTUM = proj("sanctum", "Sanctum", ["liquid_staking", "defi", "infrastructure"], {
  website: "https://sanctum.so", docs: "https://docs.sanctum.so",
  twitter: "https://twitter.com/sanctumso",
  description: "Liquid staking infrastructure and LST router.",
  token: { symbol: "INF", name: "Infinite" }, aliases: ["Sanctum SO", "Sanctum LST"],
  dataSources: [ds("defillama-sanctum", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

// ════════════════════════════════════════════════════════════════════════════
// RESTAKING
// ════════════════════════════════════════════════════════════════════════════
const RENZA = proj("renza", "Renza", ["restaking", "defi"], {
  website: "https://renza.io", description: "Liquid restaking protocol on Solana.",
  aliases: ["Renza Protocol"],
  dataSources: [ds("defillama-renza", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

// ════════════════════════════════════════════════════════════════════════════
// ORACLE — MULTI-SOURCE
// ════════════════════════════════════════════════════════════════════════════
const PYTH = proj("pyth", "Pyth Network", ["oracle", "infrastructure"], {
  website: "https://pyth.network", docs: "https://docs.pyth.network",
  github: "https://github.com/pyth-network", twitter: "https://twitter.com/PythNetwork",
  description: "High-fidelity on-chain oracle network with publisher-backed price feeds.",
  token: { symbol: "PYTH", name: "Pyth Network" },
  aliases: ["Pyth", "Pyth Network", "Pyth Data Association"],
  dataSources: [
    ds("pyth-api", "Pyth Network", "oracle", ["price_feeds", "publishers", "update_frequency", "historical"], "https://hermes.pyth.network"),
    ds("defillama-pyth", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi"),
  ],
});

const SWITCHBOARD = proj("switchboard", "Switchboard", ["oracle", "infrastructure"], {
  website: "https://switchboard.xyz", docs: "https://docs.switchboard.xyz",
  github: "https://github.com/smartcontractkit/chainlink-solana",
  twitter: "https://twitter.com/SwitchboardXYZ",
  description: "On-demand oracle feeds and randomness on Solana.",
  token: { symbol: "SGB", name: "Switchboard" },
  aliases: ["Switchboard XYZ", "Switchboard On-Demand"],
  dataSources: [
    ds("switchboard-api", "Switchboard", "oracle", ["price_feeds", "feeds", "randomness", "queue"], "https://api.switchboard.xyz"),
    ds("defillama-switchboard", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi"),
  ],
});

const CHAINLINK = proj("chainlink-solana", "Chainlink", ["oracle", "infrastructure"], {
  website: "https://chain.link", docs: "https://docs.chain.link",
  github: "https://github.com/smartcontractkit/chainlink-solana",
  twitter: "https://twitter.com/chainlink",
  description: "Chainlink price feeds on Solana.",
  token: { symbol: "LINK", name: "Chainlink" },
  aliases: ["Chainlink Solana", "Chainlink Labs"],
  dataSources: [ds("chainlink-solana", "Chainlink", "oracle", ["price_feeds"], undefined, "unknown")],
});

const DIA = proj("dia", "DIA", ["oracle", "infrastructure"], {
  website: "https://diadata.org", docs: "https://docs.diadata.org",
  github: "https://github.com/diadata-org", twitter: "https://twitter.com/DIAdata",
  description: "Open-source oracle for digital assets, DIA data feeds on Solana.",
  token: { symbol: "DIA", name: "DIA" }, aliases: ["DIA Data", "Diadata"],
  dataSources: [ds("dia-api", "DIA", "oracle", ["price_feeds", "volumes"], "https://api.diadata.org")],
});

// ════════════════════════════════════════════════════════════════════════════
// NFT MARKETPLACE — MULTI-SOURCE
// ════════════════════════════════════════════════════════════════════════════
const MAGIC_EDEN = proj("magic-eden", "Magic Eden", ["nft_marketplace", "nft"], {
  website: "https://magiceden.io", docs: "https://docs.magiceden.io",
  twitter: "https://twitter.com/MagicEden",
  description: "Largest Solana NFT marketplace — collections, listings, bids, sales.",
  aliases: ["MagicEden", "Magic Eden Marketplace", "ME"],
  dataSources: [
    ds("magic-eden-api", "Magic Eden", "marketplace", ["collections", "listings", "bids", "sales", "floor_price", "metadata", "events"], "https://api-mainnet.magiceden.dev/v2"),
    ds("defillama-magic-eden", "DeFiLlama", "api", ["volume", "fees"], "https://api.llama.fi"),
  ],
});

const TENSOR = proj("tensor", "Tensor", ["nft_marketplace", "nft"], {
  website: "https://www.tensor.trade", docs: "https://docs.tensor.trade",
  twitter: "https://twitter.com/tensor_hq",
  description: "NFT marketplace with AMM-style trading and order book.",
  token: { symbol: "TNSR", name: "Tensor" }, aliases: ["Tensor Trade", "Tensor HQ"],
  dataSources: [
    ds("tensor-api", "Tensor", "marketplace", ["collections", "listings", "bids", "sales", "floor", "activity"], "https://api.tensor.trade"),
    ds("defillama-tensor", "DeFiLlama", "api", ["volume", "fees"], "https://api.llama.fi"),
  ],
});

const HYPERSPACE = proj("hyperspace", "Hyperspace", ["nft_marketplace", "nft_aggregator", "nft"], {
  website: "https://hyperspace.xyz", twitter: "https://twitter.com/hyperspace_xyz",
  description: "NFT marketplace and aggregator across Solana marketplaces.",
  aliases: ["Hyperspace XYZ"],
  dataSources: [ds("hyperspace-api", "Hyperspace", "marketplace", ["collections", "listings", "trades", "floor"], "https://api.hyperspace.xyz/v1")],
});

const SOLANART = proj("solanart", "Solanart", ["nft_marketplace", "nft"], {
  website: "https://solanart.io", twitter: "https://twitter.com/Solanart_io",
  description: "Community-focused NFT marketplace.", aliases: ["Solanart IO"],
  dataSources: [ds("solanart-api", "Solanart", "marketplace", ["collections", "sales", "listings"], "https://qzlsklfacc.median.cloud")],
});

// ════════════════════════════════════════════════════════════════════════════
// NFT INFRASTRUCTURE
// ════════════════════════════════════════════════════════════════════════════
const METAPLEX = proj("metaplex", "Metaplex", ["nft_infrastructure", "nft", "developer_tools"], {
  website: "https://www.metaplex.com", docs: "https://docs.metaplex.com",
  github: "https://github.com/metaplex-foundation/metaplex", twitter: "https://twitter.com/Metaplex",
  description: "NFT standard, minting, and metadata infrastructure on Solana.",
  aliases: ["Metaplex Foundation"],
  dataSources: [
    ds("metaplex-rpc", "Metaplex", "onchain", ["metadata", "mint", "standards"], undefined),
    ds("metaplex-github", "Metaplex GitHub", "github", ["source_code", "releases"], "https://api.github.com/repos/metaplex-foundation/metaplex"),
  ],
});

const CNFT = proj("compressed-nfts", "Compressed NFTs (cNFT)", ["nft_infrastructure", "nft"], {
  website: "https://docs.metaplex.com/programs/compression",
  description: "State compression for NFTs — enables minting at massive scale.",
  aliases: ["cNFT", "Bubblegum", "MPL Bubblegum"], github: "https://github.com/metaplex-foundation/mpl-bubblegum",
  dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// BRIDGES
// ════════════════════════════════════════════════════════════════════════════
const WORMHOLE = proj("wormhole", "Wormhole", ["bridge", "infrastructure"], {
  website: "https://wormhole.com", docs: "https://docs.wormhole.com",
  github: "https://github.com/wormhole-foundation/wormhole", twitter: "https://twitter.com/wormholecrypto",
  description: "Cross-chain messaging and bridge protocol connecting Solana to 30+ chains.",
  token: { symbol: "W", name: "Wormhole" }, aliases: ["Wormhole Foundation", "Portal Bridge"],
  dataSources: [
    ds("defillama-wormhole", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi"),
    ds("wormhole-api", "Wormhole", "api", ["transfers", "vaas", "guardians"], "https://api.wormhole.com"),
  ],
});

const DEBRIDGE = proj("debridge", "deBridge", ["bridge", "infrastructure"], {
  website: "https://debridge.finance", docs: "https://docs.debridge.finance",
  twitter: "https://twitter.com/deBridgeFinance",
  description: "Cross-chain interoperability and liquidity transfer protocol.",
  token: { symbol: "DBR", name: "deBridge" }, aliases: ["deBridge Finance"],
  dataSources: [ds("defillama-debridge", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi")],
});

const MAYAN = proj("mayan-bridge", "Mayan", ["bridge", "infrastructure"], {
  website: "https://mayan.finance", description: "Cross-chain swap and bridge protocol.",
  aliases: ["Mayan Finance", "Mayan Swap"],
  dataSources: [ds("defillama-mayan", "DeFiLlama", "api", ["tvl", "volume"], "https://api.llama.fi")],
});

// ════════════════════════════════════════════════════════════════════════════
// WALLETS
// ════════════════════════════════════════════════════════════════════════════
const PHANTOM = proj("phantom", "Phantom", ["wallet"], {
  website: "https://phantom.com", docs: "https://docs.phantom.com",
  twitter: "https://twitter.com/phantom",
  description: "Solana-native multi-chain wallet with swap, stake, and NFT features.",
  aliases: ["Phantom Wallet"], dataSources: [],
});

const SOLFLARE = proj("solflare", "Solflare", ["wallet"], {
  website: "https://solflare.com", docs: "https://docs.solflare.com",
  twitter: "https://twitter.com/solflare_wallet",
  description: "Non-custodial Solana wallet with staking and DeFi access.",
  aliases: ["Solflare Wallet"], dataSources: [],
});

const BACKPACK = proj("backpack", "Backpack", ["wallet", "nft"], {
  website: "https://backpack.app", docs: "https://docs.backpack.app",
  twitter: "https://twitter.com/backpack",
  description: "Multi-chain wallet with xNFT support, built by Coral.",
  aliases: ["Backpack Wallet", "Coral Backpack"], dataSources: [],
});

const GLOW = proj("glow", "Glow", ["wallet"], {
  website: "https://www.glow.app", description: "Privacy-focused Solana wallet.",
  aliases: ["Glow Wallet"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// INFRASTRUCTURE / RPC / INDEXER
// ════════════════════════════════════════════════════════════════════════════
const HELIUS = proj("helius", "Helius", ["rpc", "indexer", "infrastructure", "data_provider", "developer_tools"], {
  website: "https://www.helius.dev", docs: "https://docs.helius.dev",
  github: "https://github.com/HeliusLabs", twitter: "https://twitter.com/HeliusLabs",
  description: "Solana RPC provider, DAS indexer, webhooks, and developer APIs.",
  aliases: ["Helius Labs", "Helius Dev"],
  dataSources: [
    ds("helius-rpc", "Helius", "rpc", ["rpc", "das", "webhooks", "transactions", "parsed"], "https://mainnet.helius-rpc.com", "api_key"),
    ds("helius-api", "Helius", "api", ["enhanced_transactions", "webhooks", "names"], "https://api.helius.dev", "api_key"),
  ],
});

const TRITON = proj("triton", "Triton", ["rpc", "infrastructure"], {
  website: "https://triton.one", docs: "https://docs.triton.one",
  twitter: "https://twitter.com/TritonOne", description: "High-performance Solana RPC provider.",
  aliases: ["Triton One", "Triton RPC"],
  dataSources: [ds("triton-rpc", "Triton", "rpc", ["rpc"], undefined, "api_key")],
});

const QUICKNODE = proj("quicknode", "QuickNode", ["rpc", "infrastructure"], {
  website: "https://www.quicknode.com", docs: "https://www.quicknode.com/docs",
  description: "Multi-chain RPC and API provider with Solana support.",
  aliases: ["Quick Node"],
  dataSources: [ds("quicknode-rpc", "QuickNode", "rpc", ["rpc", "functions"], undefined, "api_key")],
});

// ════════════════════════════════════════════════════════════════════════════
// DATA PROVIDERS
// ════════════════════════════════════════════════════════════════════════════
const DEXSCREENER = proj("dexscreener", "DEXScreener", ["data_provider", "infrastructure"], {
  website: "https://dexscreener.com", docs: "https://docs.dexscreener.com",
  description: "DEX trading data, pair discovery, and charting for Solana and other chains.",
  aliases: ["Dex Screener"],
  dataSources: [ds("dexscreener-api", "DEXScreener", "api", ["pairs", "prices", "volume", "transactions", "trending"], "https://api.dexscreener.com")],
});

const BIRDEYE = proj("birdeye", "Birdeye", ["data_provider", "infrastructure"], {
  website: "https://birdeye.so", docs: "https://docs.birdeye.so",
  description: "Solana-native token analytics, price tracking, and trending tokens.",
  aliases: ["Birdeye SO", "Birdeye Data"],
  dataSources: [ds("birdeye-api", "Birdeye", "api", ["token_prices", "trending", "trade_data", "ohlcv"], "https://public-api.birdeye.so", "api_key")],
});

// ════════════════════════════════════════════════════════════════════════════
// DEVELOPER TOOLS
// ════════════════════════════════════════════════════════════════════════════
const ANCHOR = proj("anchor", "Anchor", ["developer_tools"], {
  website: "https://www.anchor-lang.org", docs: "https://www.anchor-lang.org/docs",
  github: "https://github.com/coral-xyz/anchor", twitter: "https://twitter.com/anchor_lang",
  description: "Solana smart contract framework — the de facto standard for program development.",
  aliases: ["Anchor Framework", "Anchor Lang"],
  dataSources: [ds("anchor-github", "Anchor GitHub", "github", ["source_code", "releases", "stars"], "https://api.github.com/repos/coral-xyz/anchor")],
});

const SOLANA_CLI = proj("solana-cli", "Solana CLI", ["developer_tools"], {
  website: "https://docs.solana.com/cli", github: "https://github.com/solana-labs/solana",
  description: "Official Solana command-line tools for interacting with the network.",
  aliases: ["Solana Tools", "Solana Command Line"],
  dataSources: [ds("solana-cli-github", "Solana CLI GitHub", "github", ["source_code", "releases"], "https://api.github.com/repos/solana-labs/solana")],
});

const SUGAR = proj("sugar", "Metaplex Sugar", ["developer_tools", "nft_infrastructure"], {
  website: "https://docs.metaplex.com/programs/sugar", github: "https://github.com/metaplex-foundation/sugar",
  description: "Command-line tool for minting NFTs via Metaplex.",
  aliases: ["Metaplex Sugar CLI"],
  dataSources: [ds("sugar-github", "Sugar GitHub", "github", ["source_code", "releases"], "https://api.github.com/repos/metaplex-foundation/sugar")],
});

// ════════════════════════════════════════════════════════════════════════════
// SECURITY
// ════════════════════════════════════════════════════════════════════════════
const SEC3 = proj("sec3", "Sec3", ["security", "developer_tools"], {
  website: "https://www.sec3.dev", description: "Solana smart contract security auditing and monitoring.",
  aliases: ["Sec3 X-Ray"], dataSources: [],
});

const OTTERSEC = proj("ottersec", "OtterSec", ["security"], {
  website: "https://osec.io", twitter: "https://twitter.com/osec_io",
  description: "Smart contract security auditing firm focused on Solana.",
  aliases: ["OSec", "Otter Security"], dataSources: [],
});

const NEODYME = proj("neodyme", "Neodyme", ["security"], {
  website: "https://neodyme.io", twitter: "https://twitter.com/neodyme_io",
  description: "Solana smart contract security auditing firm.",
  aliases: ["Neodyme Security"], dataSources: [],
});

const ZELLIC = proj("zellic", "Zellic", ["security"], {
  website: "https://www.zellic.io", description: "Smart contract auditing firm with Solana expertise.",
  aliases: ["Zellic"], dataSources: [],
});

const SIG = proj("sig", "SIG", ["security", "developer_tools"], {
  website: "https://www.sigbuild.io", github: "https://github.com/sig-ptr",
  description: "High-performance Solana validator client.",
  aliases: ["SIG Build", "Sig PWR"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// LAUNCHPADS
// ════════════════════════════════════════════════════════════════════════════
const PUMP_FUN = proj("pump-fun", "pump.fun", ["launchpad", "meme"], {
  website: "https://pump.fun", twitter: "https://twitter.com/pumpdotfun",
  description: "Fair-launch memecoin launchpad — bonding curve token launches.",
  aliases: ["pumpfun", "Pump Fun", "PumpDotFun"],
  dataSources: [
    ds("defillama-pump-fun", "DeFiLlama", "api", ["fees", "revenue"], "https://api.llama.fi/overview/fees"),
    ds("pump-fun-api", "pump.fun", "api", ["token_launches", "volume", "bonding_curve"], "https://pump.fun/api"),
  ],
});

const BONK_FUN = proj("bonk-fun", "BONK.fun", ["launchpad", "meme"], {
  website: "https://bonk.fun", description: "Memecoin launchpad powered by BONK ecosystem.",
  aliases: ["BONK Fun", "BonkFun"],
  dataSources: [ds("defillama-bonk-fun", "DeFiLlama", "api", ["fees", "revenue"], "https://api.llama.fi/overview/fees")],
});

const LAUNCHLABS = proj("launchlabs", "LaunchLabs", ["launchpad", "meme"], {
  website: "https://launchlabs.so", description: "Memecoin launchpad by Raydium.",
  aliases: ["Launch Labs", "Raydium LaunchLabs"],
  dataSources: [ds("defillama-launchlabs", "DeFiLlama", "api", ["fees", "revenue"], "https://api.llama.fi/overview/fees")],
});

// ════════════════════════════════════════════════════════════════════════════
// GAMING
// ════════════════════════════════════════════════════════════════════════════
const STAR_ATLAS = proj("star-atlas", "Star Atlas", ["gaming", "nft"], {
  website: "https://staratlas.com", docs: "https://docs.staratlas.com",
  twitter: "https://twitter.com/staratlasgame", description: "Space-themed AAA gaming metaverse on Solana.",
  token: { symbol: "ATLAS", name: "Star Atlas" }, aliases: ["Star Atlas Game", "ATLAS"], dataSources: [],
});

const AURORY = proj("aurory", "Aurory", ["gaming", "nft"], {
  website: "https://aurory.io", twitter: "https://twitter.com/AuroryProject",
  description: "RPG gaming universe with NFT assets on Solana.",
  token: { symbol: "AURY", name: "Aurory" }, aliases: ["Aurory Project", "Aury"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// DePIN
// ════════════════════════════════════════════════════════════════════════════
const RENDER = proj("render", "Render Network", ["depin", "ai"], {
  website: "https://render.io", docs: "https://docs.render.io",
  twitter: "https://twitter.com/rendernetwork", description: "Distributed GPU rendering network.",
  token: { symbol: "RENDER", name: "Render" }, aliases: ["Render Protocol", "RNDR"], dataSources: [],
});

const HELIUM = proj("helium", "Helium", ["depin"], {
  website: "https://www.helium.com", docs: "https://docs.helium.com",
  twitter: "https://twitter.com/helium", description: "Decentralized wireless network for IoT, migrated to Solana.",
  token: { symbol: "HNT", name: "Helium" }, aliases: ["Helium Network", "Helium Mobile"], dataSources: [],
});

const IO_NET = proj("io-net", "io.net", ["depin", "ai"], {
  website: "https://io.net", twitter: "https://twitter.com/ioquantum",
  description: "Decentralized GPU compute network for AI workloads.",
  token: { symbol: "IO", name: "io.net" }, aliases: ["IO Net", "Io Quantum"], dataSources: [],
});

const KYVE = proj("kyve", "Kyve", ["depin", "data_provider", "infrastructure"], {
  website: "https://kyve.xyz", docs: "https://docs.kyve.xyz",
  twitter: "https://twitter.com/KYVENetwork", description: "Decentralized data storage and validation protocol.",
  token: { symbol: "KYVE", name: "Kyve" }, aliases: ["Kyve Network"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// AI
// ════════════════════════════════════════════════════════════════════════════
const GRASS = proj("grass", "Grass", ["ai", "depin"], {
  website: "https://www.grass.io",
  description: "Decentralized AI data layer — users share bandwidth for AI training data.",
  token: { symbol: "GRASS", name: "Grass" }, aliases: ["Grass IO", "Grass Network"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// SOCIAL
// ════════════════════════════════════════════════════════════════════════════
const DRIFT_SOCIAL = proj("drift-social", "Drift Social", ["social"], {
  website: "https://drift.so", description: "Decentralized social protocol on Solana.",
  aliases: ["Drift Protocol Social"], dataSources: [], status: "unknown",
});

// ════════════════════════════════════════════════════════════════════════════
// GOVERNANCE / DAO
// ════════════════════════════════════════════════════════════════════════════
const SQUADS = proj("squads", "Squads Protocol", ["governance", "dao", "infrastructure"], {
  website: "https://squads.so", docs: "https://docs.squads.so",
  twitter: "https://twitter.com/SquadsProtocol",
  description: "On-chain multi-sig and DAO treasury management on Solana.",
  aliases: ["Squads SO", "Squads Multisig"], dataSources: [],
});

const REALMS = proj("realms", "Realms", ["governance", "dao"], {
  website: "https://realms.today", docs: "https://docs.realms.today",
  description: "Solana governance DAO framework — SPL Governance.",
  aliases: ["Realms DAO", "SPL Governance"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// MEME ECOSYSTEM
// ════════════════════════════════════════════════════════════════════════════
const BONK = proj("bonk", "Bonk", ["meme", "defi"], {
  website: "https://bonkcoin.com", twitter: "https://twitter.com/bonk_inu",
  description: "Community-driven meme token on Solana, one of the earliest.",
  token: { symbol: "BONK", name: "Bonk", mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" },
  aliases: ["Bonk Inu", "BONK Coin", "$BONK"],
  dataSources: [ds("coingecko-bonk", "CoinGecko", "api", ["price", "volume", "market_cap"], "https://api.coingecko.com")],
});

const WIF = proj("dogwifhat", "dogwifhat", ["meme"], {
  website: "https://dogwifhat.com", description: "Popular dog-themed meme token on Solana.",
  token: { symbol: "WIF", name: "dogwifhat", mintAddress: "EKpQGSJtjMFqKZ9KQanXYfvGjBjVvfwU3kZpL6c1p9J7" }, aliases: ["WIF", "$WIF", "Dog Wif Hat"],
  dataSources: [ds("coingecko-wif", "CoinGecko", "api", ["price", "volume", "market_cap"], "https://api.coingecko.com")],
});

const POPCAT = proj("popcat", "Popcat", ["meme"], {
  website: "https://popcat.click", description: "Cat-themed meme token on Solana.",
  token: { symbol: "POPCAT", name: "Popcat", mintAddress: "7GCihgDB8fe6KNjn2MYtkzfnMKqiHKetv5VuW3M3eUBk" }, aliases: ["Pop Cat", "$POPCAT"],
  dataSources: [ds("coingecko-popcat", "CoinGecko", "api", ["price", "volume"], "https://api.coingecko.com")],
});

// ════════════════════════════════════════════════════════════════════════════
// PRIVACY
// ════════════════════════════════════════════════════════════════════════════
const ELUSIV = proj("elusiv", "Elusiv", ["privacy"], {
  website: "https://elusiv.io",
  description: "Privacy-preserving payments on Solana using zero-knowledge proofs.",
  aliases: ["Elusiv Privacy"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// IDENTITY / NAMES / DOMAINS
// ════════════════════════════════════════════════════════════════════════════
const SNS = proj("solana-name-service", "Solana Name Service", ["names", "identity"], {
  website: "https://www.sns.id", docs: "https://docs.sns.id",
  github: "https://github.com/Bonfida/sns", twitter: "https://twitter.com/sns_id",
  description: ".sol domain name service — resolve names to Solana addresses.",
  aliases: ["SNS", "Bonfida SNS", ".sol domains"],
  dataSources: [ds("sns-api", "Bonfida", "api", ["domain_lookup", "domain_records"], "https://sns-api.bonfida.com/v2")],
});

const BONFIDA = proj("bonfida", "Bonfida", ["names", "identity", "data_provider"], {
  website: "https://bonfida.com", description: "Solana Name Service operator and analytics provider.",
  aliases: ["Bonfida Analytics"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════════════════════════════════════════
const SOLANA_PAY = proj("solana-pay", "Solana Pay", ["payments"], {
  website: "https://solanapay.com", docs: "https://docs.solanapay.com",
  github: "https://github.com/solana-labs/solana-pay",
  description: "Open standard for peer-to-peer payments on Solana.",
  aliases: ["Solana Payment", "SOL Pay"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// RWA
// ════════════════════════════════════════════════════════════════════════════
const SUPERSTATE = proj("superstate", "Superstate", ["rwa", "defi"], {
  website: "https://superstate.co", description: "Tokenized U.S. Treasury fund on Solana.",
  aliases: ["Superstate Funds", "USTB"],
  dataSources: [ds("defillama-superstate", "DeFiLlama", "api", ["tvl"], "https://api.llama.fi")],
});

// ════════════════════════════════════════════════════════════════════════════
// INSURANCE & PREDICTION MARKETS
// ════════════════════════════════════════════════════════════════════════════
const INSURACE = proj("insurace", "InsurAce", ["insurance", "defi"], {
  website: "https://insurace.io", description: "DeFi insurance protocol covering Solana risks.",
  aliases: ["InsurAce Protocol"], dataSources: [],
});

const STREETH = proj("streeth", "Streeth", ["prediction_market"], {
  website: "https://streeth.io", description: "On-chain prediction market for pop culture and events.",
  aliases: ["Streeth Protocol"], dataSources: [],
});

// ════════════════════════════════════════════════════════════════════════════
// INACTIVE / DEPRECATED PROJECTS — lifecycle tracking
// ════════════════════════════════════════════════════════════════════════════
const FORMFUNCTION = proj("formfunction", "Formfunction", ["nft_marketplace"], {
  website: "https://formfunction.xyz",
  description: "NFT marketplace on Solana. Shut down in 2023.",
  aliases: ["FormFunction"],
  dataSources: [],
  status: "inactive",
});

// ════════════════════════════════════════════════════════════════════════════
// EXPORT — CANONICAL REGISTRY (86 projects)
// ════════════════════════════════════════════════════════════════════════════
export const CANONICAL_PROJECTS: EcosystemProject[] = [
  // DEX & Aggregator (10)
  RAYDIUM, ORCA, METEORA, PHOENIX, CROPPER, LIFINITY, SABER, CYKURA, SAROS, JUPITER,
  // Lending (6)
  KAMINO, MARGINFI, SOLEND, FRAKT, BANX, SHARKY,
  // Perps / Derivatives / Options (5)
  DRIFT, ZETA, PARITY, GULF_STREAM, PSYOPTIONS,
  // Stablecoins (3)
  USDC, USDT, PYUSD,
  // Yield / Vaults (2)
  TULIP, FRANCIUM,
  // Liquid Staking (4)
  JITO, MARINADE, BLAZESTAKE, SANCTUM,
  // Restaking (1)
  RENZA,
  // Oracle — multi-source (4)
  PYTH, SWITCHBOARD, CHAINLINK, DIA,
  // NFT Marketplace — multi-source (4)
  MAGIC_EDEN, TENSOR, HYPERSPACE, SOLANART,
  // NFT Infrastructure (2)
  METAPLEX, CNFT,
  // Bridges (3)
  WORMHOLE, DEBRIDGE, MAYAN,
  // Wallets (4)
  PHANTOM, SOLFLARE, BACKPACK, GLOW,
  // Infrastructure / RPC / Indexer (3)
  HELIUS, TRITON, QUICKNODE,
  // Data Providers (2)
  DEXSCREENER, BIRDEYE,
  // Developer Tools (3)
  ANCHOR, SOLANA_CLI, SUGAR,
  // Security (5)
  SEC3, OTTERSEC, NEODYME, ZELLIC, SIG,
  // Launchpads (3)
  PUMP_FUN, BONK_FUN, LAUNCHLABS,
  // Gaming (2)
  STAR_ATLAS, AURORY,
  // DePIN (4)
  RENDER, HELIUM, IO_NET, KYVE,
  // AI (1)
  GRASS,
  // Social (1)
  DRIFT_SOCIAL,
  // Governance / DAO (2)
  SQUADS, REALMS,
  // Meme Ecosystem (3)
  BONK, WIF, POPCAT,
  // Privacy (1)
  ELUSIV,
  // Identity / Names (2)
  SNS, BONFIDA,
  // Payments (1)
  SOLANA_PAY,
  // RWA (1)
  SUPERSTATE,
  // Insurance (1)
  INSURACE,
  // Prediction Markets (1)
  STREETH,
  // Inactive / Deprecated (1)
  FORMFUNCTION,
];

// ════════════════════════════════════════════════════════════════════════════
// INACTIVE / DEPRECATED PROJECTS — lifecycle tracking
// (declared above, referenced in CANONICAL_PROJECTS)
// (declared above, referenced in CANONICAL_PROJECTS)
