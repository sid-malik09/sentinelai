import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { analyzeMentionBatch } from "@/lib/analysis/pipeline";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const result = await analyzeMentionBatch(50);

  return NextResponse.json({
    ...result,
    timestamp: new Date().toISOString(),
  });
}
