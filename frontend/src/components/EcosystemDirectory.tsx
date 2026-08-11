/**
 * EcosystemDirectory — Solana Ecosystem directory component
 *
 * Editorial "map of the ecosystem" — not a CRUD database view.
 * Categories grouped by parent hierarchy. Projects navigate to /ecosystem/:id.
 * Reads ?category= from URL for deep-linking. Uses design system tokens exclusively.
 */
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowLeft } from "lucide-react";
import {
  ecosystemApi,
  type EcosystemCategoryInfo,
  type EcosystemProjectSummary,
} from "@/lib/ecosystem-api";
import { DataStateDot } from "@/components/design-system";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function EcosystemDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync selectedCategory → URL
  useEffect(() => {
    if (selectedCategory) {
      setSearchParams({ category: selectedCategory }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [selectedCategory, setSearchParams]);

  // Sync URL → selectedCategory (back/forward navigation)
  useEffect(() => {
    const urlCat = searchParams.get("category");
    setSelectedCategory(urlCat);
  }, [searchParams]);

  const { data: categoriesData } = useQuery({
    queryKey: ["ecosystem-categories"],
    queryFn: ecosystemApi.categories,
    staleTime: 60_000,
  });

  const { data: coverageData } = useQuery({
    queryKey: ["ecosystem-coverage"],
    queryFn: ecosystemApi.coverage,
    staleTime: 60_000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["ecosystem-projects", selectedCategory],
    queryFn: () => ecosystemApi.projects(selectedCategory || undefined),
    enabled: !!selectedCategory,
    staleTime: 60_000,
  });

  // All projects for search
  const { data: allProjects } = useQuery({
    queryKey: ["ecosystem-projects-all"],
    queryFn: () => ecosystemApi.projects(),
    enabled: !!searchQuery,
    staleTime: 60_000,
  });

  const searchResults = useMemo(() => {
    if (!searchQuery || !allProjects) return [];
    const q = searchQuery.toLowerCase();
    return allProjects.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.token?.symbol.toLowerCase().includes(q) ||
        p.categories.some((c) => c.toLowerCase().includes(q)),
    ).slice(0, 12);
  }, [searchQuery, allProjects]);

  // Group categories by parent
  const grouped = useMemo(() => {
    if (!categoriesData) return new Map<string, EcosystemCategoryInfo[]>();
    const map = new Map<string, EcosystemCategoryInfo[]>();
    for (const cat of categoriesData.categories) {
      const parent = cat.parent || "Other";
      if (!map.has(parent)) map.set(parent, []);
      map.get(parent)!.push(cat);
    }
    return map;
  }, [categoriesData]);

  return (
    <section id="ecosystem">
      <div className="container-editorial py-8">
        {/* Search */}
        <div className="relative max-w-md mb-8">
          <input
            type="text"
            placeholder="Search projects, tokens, categories…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 px-4 rounded-lg border border-border bg-surface text-body-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Search results */}
        <AnimatePresence>
          {searchQuery && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="mb-10 max-w-md space-y-1"
            >
              {searchResults.map((p) => (
                <ProjectRow key={p.id} project={p} delay={0} compact />
              ))}
            </motion.div>
          )}
          {searchQuery && searchResults.length === 0 && allProjects && (
            <p className="mb-10 text-body-sm text-muted-foreground">
              No projects match "{searchQuery}"
            </p>
          )}
        </AnimatePresence>

        {/* Category grid or project list */}
        {!searchQuery && !selectedCategory && (
          <div className="space-y-10">
            {Array.from(grouped.entries()).map(([parent, cats]) => (
              <div key={parent}>
                <h3 className="text-label text-muted-foreground mb-4">{parent}</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {cats.map((cat, i) => {
                    const cov = coverageData?.perCategory.find(
                      (c) => c.category === cat.id,
                    );
                    return (
                      <CategoryCard
                        key={cat.id}
                        category={cat}
                        liveCount={cov?.projectsWithLiveData ?? 0}
                        delay={i * 0.02}
                        onClick={() => setSelectedCategory(cat.id)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!searchQuery && selectedCategory && (
          <AnimatePresence mode="wait">
            <motion.div
              key="project-list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> All categories
                </button>
                <span className="text-muted-foreground/40">/</span>
                <h3 className="text-h3 text-foreground">
                  {categoriesData?.categories.find((c) => c.id === selectedCategory)?.label}
                </h3>
                <span className="text-body-sm text-muted-foreground tabular-nums">
                  {projectsData?.total ?? 0} projects
                </span>
              </div>

              <div className="grid gap-1.5">
                {projectsData?.projects.map((p, i) => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    delay={i * 0.015}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CATEGORY CARD
// ════════════════════════════════════════════════════════════════════════════
function CategoryCard({
  category,
  liveCount,
  delay,
  onClick,
}: {
  category: EcosystemCategoryInfo;
  liveCount: number;
  delay: number;
  onClick: () => void;
}) {
  const hasData = category.withDataSource > 0;
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.3, ease: EASE, delay }}
      onClick={onClick}
      className="group text-left p-4 rounded-lg border border-border bg-surface hover:border-border-strong hover:bg-surface-elevated transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-body-sm font-medium text-foreground group-hover:text-accent transition-colors">
          {category.label}
        </span>
        {hasData && (
          <DataStateDot state="available" className="mt-1" />
        )}
      </div>
      <div className="flex items-center gap-3 text-metadata text-muted-foreground">
        <span className="tabular-nums">{category.projectCount} projects</span>
        {liveCount > 0 && (
          <span className="tabular-nums data-text-available">{liveCount} live</span>
        )}
      </div>
    </motion.button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PROJECT ROW — navigates to /ecosystem/:id
// ════════════════════════════════════════════════════════════════════════════
function ProjectRow({
  project,
  delay,
  compact,
}: {
  project: EcosystemProjectSummary;
  delay: number;
  compact?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.2, ease: EASE, delay }}
      onClick={() => navigate(`/ecosystem/${project.id}`)}
      className={cn(
        "group w-full text-left flex items-center justify-between gap-4 p-3 rounded-lg",
        "hover:bg-surface-elevated transition-colors",
        compact && "p-2.5",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 h-9 w-9 rounded-md bg-surface border border-border flex items-center justify-center overflow-hidden">
          {project.logo ? (
            <img src={project.logo} alt="" className="h-full w-full object-cover" />
          ) : project.token ? (
            <span className="text-xs font-bold text-muted-foreground">
              {project.token.symbol.slice(0, 3)}
            </span>
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              {project.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-body-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">
              {project.name}
            </span>
            {project.hasLiveData && <DataStateDot state="available" />}
          </div>
          <div className="flex items-center gap-2 text-metadata text-muted-foreground">
            {project.token && (
              <span className="text-ticker text-muted-foreground">{project.token.symbol}</span>
            )}
            <span className="capitalize">{project.status}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {project.dataSourceCount > 0 ? (
          <span className="text-metadata text-muted-foreground tabular-nums">
            {project.dataSourceCount} sources
          </span>
        ) : (
          <span className="text-metadata data-text-not-reported">No source</span>
        )}
        {!compact && (
          <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
    </motion.button>
  );
}
