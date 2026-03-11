import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { RedditCollector } from "@/lib/collectors/reddit";
import { collectAndStore } from "@/lib/collectors/store";

export const maxDuration = 60;

const collector = new RedditCollector();

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const result = await collectAndStore((keywords) =>
    collector.collect(keywords)
  );

  return NextResponse.json({
    source: "reddit",
    ...result,
    timestamp: new Date().toISOString(),
  });
}
