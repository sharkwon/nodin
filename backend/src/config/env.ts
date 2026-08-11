import * as dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  API_PREFIX: process.env.API_PREFIX ?? "/api",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
  SOLANA_RPC_URL:
    process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
};