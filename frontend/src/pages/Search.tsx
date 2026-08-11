/**
 * Search page — entity search across projects, tokens, categories
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ecosystemApi } from "@/lib/ecosystem-api";
import { DataStateDot } from "@/components/design-system";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ecosystem", "search", query],
    queryFn: () => ecosystemApi.search(query),
    enabled: query.length > 1,
  });

  return (
    <div className="container-editorial py-12">
      <h1 className="text-h1 text-foreground mb-2">Search</h1>
      <p className="text-body text-muted-foreground mb-8">Search across projects, tokens, and ecosystem entities</p>

      <div className="relative max-w-xl mb-10">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Jupiter, JUP, DeFi, oracle…"
          autoFocus
          className="w-full h-12 pl-10 pr-4 rounded-lg border border-border bg-surface text-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {isLoading && (
        <div className="max-w-xl space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && data && data.results.length === 0 && query.length > 1 && (
        <p className="text-body text-muted-foreground">No results found for "{query}"</p>
      )}

      {!isLoading && data && data.results.length > 0 && (
        <div className="max-w-xl space-y-1">
          {data.results.map((result) => (
            <Link
              key={result.projectId}
              to={`/ecosystem/${result.projectId}`}
              className="group flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-surface-elevated transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <DataStateDot state="available" />
                  <span className="text-body-sm font-medium text-foreground group-hover:text-accent transition-colors">
                    {result.name}
                  </span>
                  {result.token && (
                    <span className="text-ticker text-muted-foreground">{result.token.symbol}</span>
                  )}
                </div>
                <div className="mt-1 ml-5 text-metadata text-muted-foreground">
                  {result.categories.map((c) => c.replace(/_/g, " ")).join(" · ")}
                </div>
              </div>
              <div className="flex-shrink-0 text-metadata text-muted-foreground">
                <span className="capitalize">{result.matchMethod}</span>
                <span className="ml-2 tabular-nums">{Math.round(result.confidence * 100)}%</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
