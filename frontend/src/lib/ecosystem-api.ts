/**
 * Ecosystem API client — frontend types and fetch functions for /api/ecosystem/*
 */
import apiClient from "./api-client";

// ── Types matching backend ──

export interface EcosystemCategoryInfo {
  id: string;
  label: string;
  description: string;
  parent?: string;
  projectCount: number;
  withDataSource: number;
}

export interface EcosystemCategoriesResponse {
  totalCategories: number;
  totalProjects: number;
  categories: EcosystemCategoryInfo[];
}

export interface EcosystemProjectSummary {
  id: string;
  name: string;
  slug: string;
  categories: string[];
  status: string;
  verificationStage: string;
  website?: string;
  logo?: string;
  token?: { symbol: string; name: string; mintAddress?: string };
  dataSourceCount: number;
  hasLiveData: boolean;
  hasRegisteredSource: boolean;
}

export interface EcosystemProjectsResponse {
  total: number;
  projects: EcosystemProjectSummary[];
}

export interface DataSourceWithHealth {
  id: string;
  provider: string;
  type: string;
  capabilities: string[];
  endpoint?: string;
  authentication: string;
  resolvedConnector: string | null;
  isLive: boolean;
  isRegistered: boolean;
  dataState: "available" | "unavailable" | "stale" | "loading" | "not_reported";
  health?: {
    sourceId: string;
    currentStatus: string;
    confidence: number;
    consecutiveFailures: number;
    lastCheckedAt: string;
    lastSuccessAt?: string;
  };
}

export interface DataCompleteness {
  metadata: number;
  marketData: number;
  onChainData: number;
  socialData: number;
  newsData: number;
  historicalData: number;
  overall: number;
}

export interface EcosystemProjectDetail extends EcosystemProjectSummary {
  description?: string;
  docs?: string;
  github?: string;
  twitter?: string;
  discord?: string;
  aliases?: string[];
  contracts?: { kind: string; address: string; label?: string; isPrimary?: boolean }[];
  token?: { symbol: string; name: string; mintAddress?: string; coingeckoId?: string };
  dataSources: DataSourceWithHealth[];
  dataCompleteness: DataCompleteness;
  lastVerifiedAt: string;
  lastUpdated: string;
}

export interface CoverageReportItem {
  category: string;
  categoryLabel: string;
  discoveredProjects: number;
  registeredProjects: number;
  projectsWithDataSource: number;
  projectsWithVerifiedIdentity: number;
  projectsWithLiveData: number;
  coverageScore: number;
  missingProjects: string[];
  missingDataSources: string[];
  projectsWithoutSources: string[];
}

export interface SeparatedCoverage {
  registryCoverage: number;
  sourceCoverage: number;
  liveDataCoverage: number;
  completeness: number;
  freshness: number;
  totalProjects: number;
  projectsWithRegisteredSource: number;
  projectsWithLiveData: number;
  projectsMetadataOnly: number;
  projectsNoSource: number;
}

export interface CoverageSummary {
  totalCategories: number;
  totalDiscovered: number;
  totalRegistered: number;
  totalVerified: number;
  totalWithLiveData: number;
  overallCoverageScore: number;
  perCategory: CoverageReportItem[];
  generatedAt: string;
  separated: SeparatedCoverage;
}

export interface SourceHealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  rate_limited: number;
  unavailable: number;
  stale: number;
  unknown: number;
  sources: {
    sourceId: string;
    provider: string;
    status: string;
    confidence: number;
    lastCheckedAt: string;
    projectsUsing: string[];
    projectIds: string[];
  }[];
}

// ── V2: Intelligence metrics ──

export interface IntelligenceMetric {
  value: number | null;
  status: "available" | "unavailable" | "stale";
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  slug: string;
  isPrimary: boolean;
}

export interface ProjectIntelligence {
  projectId: string;
  defiLlamaSlug: string | null;
  isMapped: boolean;
  tvl: IntelligenceMetric;
  totalTvl: IntelligenceMetric;
  change24h: IntelligenceMetric;
  change7d: IntelligenceMetric;
  marketCap: IntelligenceMetric;
  hasHistory: boolean;
  history: { date: number; tvl: number }[] | null;
  chains: string[] | null;
  auditLinks: string[] | null;
  description: string | null;
  mapping: {
    matchMethod: string;
    confidence: number;
    isPrimary: boolean;
  } | null;
  fetchedAt: string;
}

export interface RelatedProject {
  id: string;
  name: string;
  slug: string;
  categories: string[];
  status: string;
  website?: string;
  token?: { symbol: string; name: string };
  dataSourceCount: number;
}

export interface RelatedProjectsResponse {
  projectId: string;
  related: RelatedProject[];
}

// ── API functions ──

export const ecosystemApi = {
  categories: () =>
    apiClient.get<EcosystemCategoriesResponse>("/ecosystem/categories").then((r) => r.data),

  projects: (category?: string) =>
    apiClient
      .get<EcosystemProjectsResponse>("/ecosystem/projects", {
        params: category ? { category } : undefined,
      })
      .then((r) => r.data),

  projectDetail: (id: string) =>
    apiClient.get<EcosystemProjectDetail>(`/ecosystem/projects/${id}`).then((r) => r.data),

  coverage: () =>
    apiClient.get<CoverageSummary>("/ecosystem/coverage").then((r) => r.data),

  coverageByCategory: (category: string) =>
    apiClient.get<CoverageReportItem & {
      missingProjects: string[];
      missingDataSources: string[];
      projectsWithoutSources: string[];
      missingCapabilities: string[];
      staleSources: string[];
      unavailableSources: string[];
    }>(`/ecosystem/coverage/${category}`).then((r) => r.data),

  sources: () =>
    apiClient.get<SourceHealthSummary>("/ecosystem/sources").then((r) => r.data),

  discover: () =>
    apiClient.get<{
      totalCandidates: number;
      newProjects: number;
      duplicates: number;
      rejected: number;
    }>("/ecosystem/discover").then((r) => r.data),

  search: (q: string) =>
    apiClient.get<{
      results: {
        projectId: string;
        name: string;
        slug: string;
        categories: string[];
        confidence: number;
        matchMethod: string;
        website?: string;
        token?: { symbol: string };
      }[];
    }>("/ecosystem/search", { params: { q } }).then((r) => r.data),

  // V2: Project intelligence — live DeFiLlama metrics
  projectIntelligence: (id: string) =>
    apiClient.get<ProjectIntelligence>(`/ecosystem/projects/${id}/intelligence`).then((r) => r.data),

  // V2: Related projects — by shared categories
  relatedProjects: (id: string) =>
    apiClient.get<RelatedProjectsResponse>(`/ecosystem/projects/${id}/related`).then((r) => r.data),
};
