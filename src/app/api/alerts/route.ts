import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alerts, alertRules } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  const allAlerts = await db
    .select({
      id: alerts.id,
      ruleId: alerts.ruleId,
      ruleName: alertRules.name,
      ruleType: alertRules.ruleType,
      triggeredAt: alerts.triggeredAt,
      severity: alerts.severity,
      summary: alerts.summary,
      data: alerts.data,
      acknowledged: alerts.acknowledged,
    })
    .from(alerts)
    .leftJoin(alertRules, eq(alerts.ruleId, alertRules.id))
    .orderBy(desc(alerts.triggeredAt))
    .limit(limit);

  return NextResponse.json(allAlerts);
}
