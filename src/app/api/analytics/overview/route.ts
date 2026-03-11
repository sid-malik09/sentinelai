import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mentions, analyses, alertRules, topics } from "@/lib/db/schema";
import { sql, eq, gte, and } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rateLimited = await checkRateLimit(
    request.headers.get("x-forwarded-for") ?? "anonymous"
  );
  if (rateLimited) return rateLimited;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [
    totalMentionsResult,
    avgSentimentResult,
    activeAlertsResult,
    sourceDistribution,
    sentimentDistribution,
    recentMentions,
  ] = await Promise.all([
    // Total mentions
    db
      .select({ count: sql<number>`count(*)` })
      .from(mentions),

    // Average sentiment (last 30 days)
    db
      .select({
        avg: sql<number>`avg(${analyses.sentimentScore})`,
      })
      .from(analyses)
      .innerJoin(mentions, eq(analyses.mentionId, mentions.id))
      .where(gte(mentions.collectedAt, thirtyDaysAgo)),

    // Active alert rules count
    db
      .select({ count: sql<number>`count(*)` })
      .from(alertRules)
      .where(eq(alertRules.isActive, true)),

    // Mentions by source
    db
      .select({
        source: mentions.source,
        count: sql<number>`count(*)`,
      })
      .from(mentions)
      .groupBy(mentions.source),

    // Sentiment distribution
    db
      .select({
        label: analyses.sentimentLabel,
        count: sql<number>`count(*)`,
      })
      .from(analyses)
      .groupBy(analyses.sentimentLabel),

    // 5 most recent mentions with sentiment
    db
      .select({
        id: mentions.id,
        source: mentions.source,
        title: mentions.title,
        author: mentions.author,
        publishedAt: mentions.publishedAt,
        sentimentLabel: analyses.sentimentLabel,
        sentimentScore: analyses.sentimentScore,
        engagement: mentions.engagement,
      })
      .from(mentions)
      .leftJoin(analyses, eq(mentions.id, analyses.mentionId))
      .orderBy(sql`${mentions.publishedAt} desc nulls last`)
      .limit(5),
  ]);

  const avgSentiment = avgSentimentResult[0]?.avg;

  return NextResponse.json({
    stats: {
      totalMentions: Number(totalMentionsResult[0].count),
      avgSentiment:
        avgSentiment != null ? Math.round(avgSentiment * 100) / 100 : null,
      activeAlertRules: Number(activeAlertsResult[0].count),
      sourcesActive: sourceDistribution.length,
    },
    sourceDistribution: sourceDistribution.map((s) => ({
      source: s.source,
      count: Number(s.count),
    })),
    sentimentDistribution: sentimentDistribution.map((s) => ({
      label: s.label,
      count: Number(s.count),
    })),
    recentMentions,
  });
}
