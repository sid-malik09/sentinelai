import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alertRules, projects } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createAlertRuleSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  ruleType: z.enum(["sentiment_drop", "volume_spike", "keyword_alert"]),
  conditions: z.object({
    threshold: z.number().optional(),
    window_hours: z.number().min(1).max(720).optional(),
    keywords: z.array(z.string()).optional(),
    sentiment_below: z.number().min(-1).max(1).optional(),
    volume_above: z.number().min(1).optional(),
  }),
  notificationChannels: z.array(
    z.object({
      type: z.enum(["email", "webhook", "slack"]),
      target: z.string().min(1),
    })
  ),
});

export async function GET() {
  const rules = await db
    .select({
      id: alertRules.id,
      projectId: alertRules.projectId,
      projectName: projects.name,
      name: alertRules.name,
      ruleType: alertRules.ruleType,
      conditions: alertRules.conditions,
      notificationChannels: alertRules.notificationChannels,
      isActive: alertRules.isActive,
      createdAt: alertRules.createdAt,
    })
    .from(alertRules)
    .leftJoin(projects, eq(alertRules.projectId, projects.id))
    .orderBy(desc(alertRules.createdAt));

  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createAlertRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const [rule] = await db
    .insert(alertRules)
    .values(parsed.data)
    .returning();

  return NextResponse.json(rule, { status: 201 });
}
