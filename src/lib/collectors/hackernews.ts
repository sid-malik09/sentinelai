import type { Collector, CollectorResult, CollectedMention } from "./base";

interface HNHit {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
  story_text: string | null;
  comment_text: string | null;
  story_id: number | null;
  story_url: string | null;
  story_title: string | null;
}

interface HNSearchResponse {
  hits: HNHit[];
  nbHits: number;
}

const HN_ALGOLIA_URL = "https://hn.algolia.com/api/v1";

export class HackerNewsCollector implements Collector {
  name = "hackernews";

  async collect(keywords: string[]): Promise<CollectorResult> {
    const mentions: CollectedMention[] = [];
    const errors: string[] = [];

    for (const keyword of keywords) {
      try {
        // Search stories from the last 24 hours
        const timestamp24hAgo = Math.floor(Date.now() / 1000) - 86400;
        const params = new URLSearchParams({
          query: keyword,
          tags: "(story,comment)",
          numericFilters: `created_at_i>${timestamp24hAgo}`,
          hitsPerPage: "50",
        });

        const res = await fetch(`${HN_ALGOLIA_URL}/search?${params}`);
        if (!res.ok) {
          errors.push(`HN search failed for "${keyword}": ${res.status}`);
          continue;
        }

        const data: HNSearchResponse = await res.json();

        for (const hit of data.hits) {
          const isComment = !!hit.comment_text;
          const content = hit.comment_text ?? hit.story_text ?? hit.title ?? "";

          if (!content || content.length < 10) continue;

          const sourceUrl = isComment
            ? `https://news.ycombinator.com/item?id=${hit.objectID}`
            : hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;

          mentions.push({
            source: "hackernews",
            sourceId: `hn-${hit.objectID}`,
            sourceUrl,
            author: hit.author,
            title: isComment
              ? hit.story_title ?? undefined
              : hit.title ?? undefined,
            content: stripHtml(content),
            publishedAt: new Date(hit.created_at_i * 1000),
            engagement: {
              score: hit.points ?? 0,
              comments: hit.num_comments ?? 0,
            },
            metadata: {
              type: isComment ? "comment" : "story",
              storyId: hit.story_id,
            },
          });
        }
      } catch (err) {
        errors.push(
          `HN collector error for "${keyword}": ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return { mentions: deduplicateBySourceId(mentions), errors };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
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
