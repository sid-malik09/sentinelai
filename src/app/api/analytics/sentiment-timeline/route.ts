import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mentions, analyses } from "@/lib/db/schema";
import { eq, gte, lte, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get("days") ?? "14");
  const source = searchParams.get("source");

  const startDate = new Date(Date.now() - days * 86400000);

  const conditions = [gte(mentions.collectedAt, startDate)];
  if (source) conditions.push(eq(mentions.source, source));

  const timeline = await db
    .select({
      date: sql<string>`date(${mentions.collectedAt})`,
      avgSentiment: sql<number>`avg(${analyses.sentimentScore})`,
      mentionCount: sql<number>`count(*)`,
      positiveCount: sql<number>`sum(case when ${analyses.sentimentLabel} = 'positive' then 1 else 0 end)`,
      negativeCount: sql<number>`sum(case when ${analyses.sentimentLabel} = 'negative' then 1 else 0 end)`,
      neutralCount: sql<number>`sum(case when ${analyses.sentimentLabel} = 'neutral' then 1 else 0 end)`,
    })
    .from(mentions)
    .leftJoin(analyses, eq(mentions.id, analyses.mentionId))
    .where(and(...conditions))
    .groupBy(sql`date(${mentions.collectedAt})`)
    .orderBy(sql`date(${mentions.collectedAt})`);

  return NextResponse.json(
    timeline.map((row) => ({
      date: row.date,
      avgSentiment:
        row.avgSentiment != null
          ? Math.round(row.avgSentiment * 100) / 100
          : null,
      mentionCount: Number(row.mentionCount),
      positive: Number(row.positiveCount ?? 0),
      negative: Number(row.negativeCount ?? 0),
      neutral: Number(row.neutralCount ?? 0),
    }))
  );
}
