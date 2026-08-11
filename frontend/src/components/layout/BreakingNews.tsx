/**
 * BreakingNews — thin breaking-news rail at the top of the page
 *
 * Subtle marquee motion. Timestamp, category, source. No flashing.
 */
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/components/design-system";

interface BreakingNewsItem {
  id: string;
  title: string;
  category?: string;
  publishedAt: string;
  url?: string;
}

interface BreakingNewsProps {
  items: BreakingNewsItem[];
  className?: string;
}

export function BreakingNews({ items, className }: BreakingNewsProps) {
  if (!items.length) return null;

  const top = items.slice(0, 5);

  return (
    <div className={cn("border-b border-border-subtle bg-surface", className)}>
      <div className="container-editorial">
        <div className="flex items-center gap-3 py-2">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Zap className="h-3.5 w-3.5 text-warning" />
            <span className="text-label text-warning">Breaking</span>
          </div>
          <div className="h-4 w-px bg-border flex-shrink-0" />
          {/* Static list — no marquee to avoid content leaving viewport */}
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-6 overflow-x-auto nodin-scroll whitespace-nowrap">
              {top.map((item, i) => (
                <span key={`${item.id}-${i}`} className="text-body-sm text-secondary flex-shrink-0">
                  {item.category && (
                    <span className="text-muted-foreground mr-2">{item.category}</span>
                  )}
                  {item.title}
                  <span className="text-muted-foreground ml-2">· {timeAgo(item.publishedAt)}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
