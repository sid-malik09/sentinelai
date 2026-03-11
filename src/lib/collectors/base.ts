export interface CollectedMention {
  source: string;
  sourceId: string;
  sourceUrl: string;
  author?: string;
  authorFollowers?: number;
  title?: string;
  content: string;
  publishedAt?: Date;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    score?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface CollectorResult {
  mentions: CollectedMention[];
  errors: string[];
}

export interface Collector {
  name: string;
  collect(keywords: string[]): Promise<CollectorResult>;
}

/**
 * Filters out mentions that contain any of the exclude keywords.
 */
export function filterExcluded(
  mentions: CollectedMention[],
  excludeKeywords: string[]
): CollectedMention[] {
  if (excludeKeywords.length === 0) return mentions;

  const lowerExclude = excludeKeywords.map((k) => k.toLowerCase());
  return mentions.filter((m) => {
    const text = `${m.title ?? ""} ${m.content}`.toLowerCase();
    return !lowerExclude.some((kw) => text.includes(kw));
  });
}
