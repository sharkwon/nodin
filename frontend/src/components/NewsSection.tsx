"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Twitter, Globe, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { insightApi, type NewsItem, type TweetItem } from "@/lib/nodin";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/components/design-system";

/**
 * NewsSection — editorial news + Twitter feed
 *
 * Uses design system tokens. No hard-coded hex colors.
 */
const CATEGORY_CONFIG: Record<NewsItem["category"], { label: string; className: string }> = {
  simd: { label: "SIMD", className: "text-info" },
  upgrade: { label: "Upgrade", className: "text-accent" },
  ecosystem: { label: "Ecosystem", className: "text-info" },
  defi: { label: "DeFi", className: "text-warning" },
  general: { label: "General", className: "text-muted-foreground" },
};

export function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [tweets, setTweets] = useState<TweetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insightApi
      .news()
      .then((d) => {
        setNews(d.news);
        setTweets(d.tweets);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="news" className="border-t border-border">
      <div className="container-editorial">
        {/* Section header */}
        <div className="flex items-center justify-between py-5 border-b border-border">
          <span className="text-label text-muted-foreground">Latest on the Wind</span>
          <span className="text-label text-muted-foreground/60 tabular-nums">
            {news.length + tweets.length} items
          </span>
        </div>

        {loading ? (
          <div className="grid lg:grid-cols-[72fr_28fr]">
            <div className="border-r border-border p-6 grid gap-4 md:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-48 rounded-lg skeleton" />
              ))}
            </div>
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg skeleton" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[72fr_28fr]">
            {/* News (left 72%) */}
            <div className="border-r border-border">
              <div className="px-6 lg:px-10 py-4 border-b border-border flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-accent" />
                <span className="text-label text-muted-foreground">News · solana.com RSS</span>
              </div>
              {news.length ? (
                <div className="grid gap-0 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  {news.map((item) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyState message="No news — RSS unreachable" />
              )}
            </div>

            {/* Twitter (right 28%) */}
            <div>
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Twitter className="h-3.5 w-3.5 text-accent" />
                <span className="text-label text-muted-foreground">Twitter</span>
              </div>
              {tweets.length ? (
                <div className="divide-y divide-border">
                  {tweets.map((tweet) => (
                    <TweetRow key={tweet.id} tweet={tweet} />
                  ))}
                </div>
              ) : (
                <EmptyState message="No tweets" />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.general;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={0}
      className="group relative flex flex-col transition-colors hover:bg-surface/50 focus-visible:bg-surface/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent border-b md:border-b-0"
    >
      {item.imageUrl && (
        <div className="relative h-40 overflow-hidden bg-surface">
          <img
            src={item.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-3">
            <span className={cn("text-metadata font-medium", cat.className)}>{cat.label}</span>
          </div>
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 text-metadata text-muted-foreground mb-1.5">
          <span className="font-medium text-muted-foreground/80">{item.source}</span>
          {item.publishedAt && (
            <>
              <span>·</span>
              <Clock className="h-2.5 w-2.5" />
              <time dateTime={item.publishedAt}>{timeAgo(item.publishedAt)}</time>
            </>
          )}
        </div>
        <h3 className="text-body-sm font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 text-pretty">
          {item.title}
        </h3>
        {item.summary && (
          <p className="mt-1 text-caption text-muted-foreground line-clamp-2 text-pretty">{item.summary}</p>
        )}
        {/* Entity links */}
        {item.entityLinks && item.entityLinks.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {item.entityLinks.slice(0, 3).map((link) => (
              <Link
                key={link.projectId}
                to={`/ecosystem/${link.projectId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-metadata text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                {link.projectName}
              </Link>
            ))}
          </div>
        )}
        <span className="mt-2 inline-flex items-center gap-1 text-metadata font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
          Read more <ExternalLink className="h-2.5 w-2.5" />
        </span>
      </div>
    </a>
  );
}

function TweetRow({ tweet }: { tweet: TweetItem }) {
  return (
    <a
      href={tweet.url}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={0}
      className="group block px-5 py-3.5 transition-colors hover:bg-surface/50 focus-visible:bg-surface/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent"
    >
      <div className="flex gap-2.5">
        <div className="h-7 w-7 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-foreground font-bold text-[10px] shrink-0">
          {(tweet.handle || "?")[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-metadata">
            <span className="font-semibold text-foreground truncate">{tweet.handle}</span>
            <span className="text-muted-foreground/60 truncate">@{tweet.author || tweet.handle}</span>
          </div>
          <p className="mt-0.5 text-caption text-muted-foreground line-clamp-3 group-hover:text-secondary transition-colors text-pretty">
            {tweet.content}
          </p>
        </div>
      </div>
    </a>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-label text-muted-foreground/40">{message}</p>
    </div>
  );
}
