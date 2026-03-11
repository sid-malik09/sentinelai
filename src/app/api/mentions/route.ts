import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mentions, analyses, topics } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const source = searchParams.get("source");
  const topicId = searchParams.get("topicId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (source) conditions.push(eq(mentions.source, source));
  if (topicId) conditions.push(eq(mentions.topicId, topicId));
  if (startDate)
    conditions.push(gte(mentions.publishedAt, new Date(startDate)));
  if (endDate) conditions.push(lte(mentions.publishedAt, new Date(endDate)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [results, countResult] = await Promise.all([
    db
      .select({
        id: mentions.id,
        topicId: mentions.topicId,
        source: mentions.source,
        sourceId: mentions.sourceId,
        sourceUrl: mentions.sourceUrl,
        author: mentions.author,
        title: mentions.title,
        content: mentions.content,
        publishedAt: mentions.publishedAt,
        collectedAt: mentions.collectedAt,
        engagement: mentions.engagement,
        sentimentScore: analyses.sentimentScore,
        sentimentLabel: analyses.sentimentLabel,
        topicName: topics.name,
      })
      .from(mentions)
      .leftJoin(analyses, eq(mentions.id, analyses.mentionId))
      .leftJoin(topics, eq(mentions.topicId, topics.id))
      .where(where)
      .orderBy(desc(mentions.publishedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(mentions)
      .where(where),
  ]);

  return NextResponse.json({
    mentions: results,
    pagination: {
      page,
      limit,
      total: Number(countResult[0].count),
      totalPages: Math.ceil(Number(countResult[0].count) / limit),
    },
  });
}
