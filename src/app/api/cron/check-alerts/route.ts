import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { evaluateAllRules } from "@/lib/alerts/evaluator";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const result = await evaluateAllRules();

  return NextResponse.json({
    ...result,
    timestamp: new Date().toISOString(),
  });
}
