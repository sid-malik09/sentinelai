import Parser from "rss-parser";
import type { Collector, CollectorResult, CollectedMention } from "./base";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "SentinelAI/1.0",
  },
});

// Default tech/business RSS feeds — can be made configurable later
const DEFAULT_FEEDS = [
  "https://hnrss.org/newest",
  "https://feeds.arstechnica.com/arstechnica/index",
  "https://www.theverge.com/rss/index.xml",
  "https://techcrunch.com/feed/",
  "https://feeds.feedburner.com/venturebeat/SZYF",
];

export class NewsRssCollector implements Collector {
  name = "news";
  private feeds: string[];

  constructor(feeds?: string[]) {
    this.feeds = feeds ?? DEFAULT_FEEDS;
  }

  async collect(keywords: string[]): Promise<CollectorResult> {
    const mentions: CollectedMention[] = [];
    const errors: string[] = [];
    const lowerKeywords = keywords.map((k) => k.toLowerCase());

    for (const feedUrl of this.feeds) {
      try {
        const feed = await parser.parseURL(feedUrl);

        for (const item of feed.items) {
          const title = item.title ?? "";
          const content = item.contentSnippet ?? item.content ?? "";
          const text = `${title} ${content}`.toLowerCase();

          // Check if any keyword matches
          const matches = lowerKeywords.some((kw) => text.includes(kw));
          if (!matches) continue;

          const publishedAt = item.isoDate
            ? new Date(item.isoDate)
            : item.pubDate
              ? new Date(item.pubDate)
              : undefined;

          // Skip articles older than 48 hours
          if (publishedAt) {
            const ageMs = Date.now() - publishedAt.getTime();
            if (ageMs > 48 * 60 * 60 * 1000) continue;
          }

          const sourceId = item.guid ?? item.link ?? `${feedUrl}-${title}`;

          mentions.push({
            source: "news",
            sourceId: `news-${hashString(sourceId)}`,
            sourceUrl: item.link ?? feedUrl,
            author: item.creator ?? item.author ?? feed.title ?? undefined,
            title: title || undefined,
            content: content || title,
            publishedAt,
            engagement: {},
            metadata: {
              feedTitle: feed.title,
              feedUrl,
              categories: item.categories,
            },
          });
        }
      } catch (err) {
        errors.push(
          `RSS feed error (${feedUrl}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return { mentions: deduplicateBySourceId(mentions), errors };
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function deduplicateBySourceId(
  mentions: CollectedMention[]
): CollectedMention[] {
  const seen = new Set<string>();
  return mentions.filter((m) => {
    if (seen.has(m.sourceId)) return false;
    seen.add(m.sourceId);
    return true;
  });
}
