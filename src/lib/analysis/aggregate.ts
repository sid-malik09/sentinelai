import { db } from "@/lib/db";
import { mentions, analyses, dailyAggregates, topics } from "@/lib/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

/**
 * Aggregates mention data for a given date (defaults to yesterday).
 * Creates/updates rows in the daily_aggregates table.
 */
export async function aggregateDaily(dateStr?: string): Promise<{
  aggregatesCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let aggregatesCreated = 0;

  // Default to yesterday
  const targetDate = dateStr
    ? new Date(dateStr)
    : new Date(Date.now() - 86400000);
  const dateKey = targetDate.toISOString().split("T")[0];
  const dayStart = new Date(`${dateKey}T00:00:00Z`);
  const dayEnd = new Date(`${dateKey}T23:59:59.999Z`);

  const activeTopics = await db.query.topics.findMany({
    where: eq(topics.isActive, true),
  });

  const sources = ["hackernews", "reddit", "news"];

  for (const topic of activeTopics) {
    for (const source of sources) {
      try {
        // Get mentions for this topic/source/date
        const dayMentions = await db
          .select({
            id: mentions.id,
            engagement: mentions.engagement,
            sentimentScore: analyses.sentimentScore,
            sentimentLabel: analyses.sentimentLabel,
            emotions: analyses.emotions,
            keyPhrases: analyses.keyPhrases,
          })
          .from(mentions)
          .leftJoin(analyses, eq(mentions.id, analyses.mentionId))
          .where(
            and(
              eq(mentions.topicId, topic.id),
              eq(mentions.source, source),
              gte(mentions.collectedAt, dayStart),
              lt(mentions.collectedAt, dayEnd)
            )
          );

        if (dayMentions.length === 0) continue;

        // Calculate aggregates
        const mentionCount = dayMentions.length;

        const sentimentScores = dayMentions
          .map((m) => m.sentimentScore)
          .filter((s): s is number => s != null);

        const avgSentiment =
          sentimentScores.length > 0
            ? sentimentScores.reduce((a, b) => a + b, 0) /
              sentimentScores.length
            : null;

        // Sentiment distribution
        const labels = dayMentions
          .map((m) => m.sentimentLabel)
          .filter(Boolean);
        const sentimentDistribution = {
          positive: labels.filter((l) => l === "positive").length,
          negative: labels.filter((l) => l === "negative").length,
          neutral: labels.filter((l) => l === "neutral").length,
          mixed: labels.filter((l) => l === "mixed").length,
        };

        // Top emotions (aggregate across Claude-analyzed mentions)
        const emotionTotals: Record<string, number> = {};
        let emotionCount = 0;
        for (const m of dayMentions) {
          if (m.emotions) {
            emotionCount++;
            for (const [emotion, score] of Object.entries(
              m.emotions as Record<string, number>
            )) {
              emotionTotals[emotion] = (emotionTotals[emotion] ?? 0) + score;
            }
          }
        }
        const topEmotions =
          emotionCount > 0
            ? Object.entries(emotionTotals)
                .map(([emotion, total]) => ({
                  emotion,
                  score: Math.round((total / emotionCount) * 100) / 100,
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
            : [];

        // Top phrases
        const phraseCounts: Record<string, number> = {};
        for (const m of dayMentions) {
          if (m.keyPhrases) {
            for (const phrase of m.keyPhrases as string[]) {
              phraseCounts[phrase] = (phraseCounts[phrase] ?? 0) + 1;
            }
          }
        }
        const topPhrases = Object.entries(phraseCounts)
          .map(([phrase, count]) => ({ phrase, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Total engagement
        const totalEngagement = { likes: 0, comments: 0, shares: 0, views: 0 };
        for (const m of dayMentions) {
          const eng = m.engagement as Record<string, number> | null;
          if (eng) {
            totalEngagement.likes += eng.likes ?? eng.score ?? 0;
            totalEngagement.comments += eng.comments ?? 0;
            totalEngagement.shares += eng.shares ?? 0;
            totalEngagement.views += eng.views ?? 0;
          }
        }

        // Upsert into daily_aggregates
        await db
          .insert(dailyAggregates)
          .values({
            topicId: topic.id,
            source,
            date: dateKey,
            mentionCount,
            avgSentiment,
            sentimentDistribution,
            topEmotions,
            topPhrases,
            totalEngagement,
          })
          .onConflictDoUpdate({
            target: [
              dailyAggregates.topicId,
              dailyAggregates.date,
              dailyAggregates.source,
            ],
            set: {
              mentionCount,
              avgSentiment,
              sentimentDistribution,
              topEmotions,
              topPhrases,
              totalEngagement,
            },
          });

        aggregatesCreated++;
      } catch (err) {
        errors.push(
          `Aggregate error (${topic.name}/${source}): ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  return { aggregatesCreated, errors };
}
