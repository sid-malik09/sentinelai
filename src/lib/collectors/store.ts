import { db } from "@/lib/db";
import { mentions, topics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { CollectedMention } from "./base";
import { filterExcluded } from "./base";

/**
 * Fetches all active topics with their keywords, runs a collector
 * function against them, and stores the results in the mentions table.
 * Returns a summary of what was collected.
 */
export async function collectAndStore(
  collectorFn: (keywords: string[]) => Promise<{
    mentions: CollectedMention[];
    errors: string[];
  }>
): Promise<{
  topicsProcessed: number;
  mentionsStored: number;
  duplicatesSkipped: number;
  errors: string[];
}> {
  const activeTopics = await db.query.topics.findMany({
    where: eq(topics.isActive, true),
  });

  if (activeTopics.length === 0) {
    return {
      topicsProcessed: 0,
      mentionsStored: 0,
      duplicatesSkipped: 0,
      errors: [],
    };
  }

  let totalStored = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  for (const topic of activeTopics) {
    const keywords = topic.keywords as { include: string[]; exclude: string[] };
    if (!keywords.include || keywords.include.length === 0) continue;

    const result = await collectorFn(keywords.include);
    allErrors.push(...result.errors);

    // Filter out excluded keywords
    const filtered = filterExcluded(result.mentions, keywords.exclude ?? []);

    // Store each mention, skipping duplicates
    for (const mention of filtered) {
      try {
        await db
          .insert(mentions)
          .values({
            topicId: topic.id,
            source: mention.source,
            sourceId: mention.sourceId,
            sourceUrl: mention.sourceUrl,
            author: mention.author,
            authorFollowers: mention.authorFollowers,
            title: mention.title,
            content: mention.content,
            publishedAt: mention.publishedAt,
            engagement: mention.engagement,
            metadata: mention.metadata,
          })
          .onConflictDoNothing({
            target: [mentions.source, mentions.sourceId],
          });
        totalStored++;
      } catch (err) {
        // If it's a unique constraint violation, count as skipped
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("unique") || message.includes("duplicate")) {
          totalSkipped++;
        } else {
          allErrors.push(`Store error: ${message}`);
        }
      }
    }
  }

  return {
    topicsProcessed: activeTopics.length,
    mentionsStored: totalStored,
    duplicatesSkipped: totalSkipped,
    errors: allErrors,
  };
}
