import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mentions } from "@/lib/db/schema";
import { eq, gte, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get("days") ?? "14");
  const source = searchParams.get("source");

  const startDate = new Date(Date.now() - days * 86400000);

  const conditions = [gte(mentions.collectedAt, startDate)];
  if (source) conditions.push(eq(mentions.source, source));

  const volume = await db
    .select({
      date: sql<string>`date(${mentions.collectedAt})`,
      source: mentions.source,
      count: sql<number>`count(*)`,
    })
    .from(mentions)
    .where(and(...conditions))
    .groupBy(sql`date(${mentions.collectedAt})`, mentions.source)
    .orderBy(sql`date(${mentions.collectedAt})`);

  // Pivot: group by date, with sources as keys
  const byDate: Record<string, Record<string, number>> = {};
  for (const row of volume) {
    if (!byDate[row.date]) byDate[row.date] = {};
    byDate[row.date][row.source] = Number(row.count);
  }

  return NextResponse.json(
    Object.entries(byDate).map(([date, sources]) => ({
      date,
      ...sources,
      total: Object.values(sources).reduce((a, b) => a + b, 0),
    }))
  );
}
