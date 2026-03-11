import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { aggregateDaily } from "@/lib/analysis/aggregate";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  // Allow passing a date for backfill: ?date=2026-03-10
  const dateParam = request.nextUrl.searchParams.get("date") ?? undefined;

  const result = await aggregateDaily(dateParam);

  return NextResponse.json({
    ...result,
    timestamp: new Date().toISOString(),
  });
}
