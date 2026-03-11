import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alertRules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateAlertRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  conditions: z
    .object({
      threshold: z.number().optional(),
      window_hours: z.number().min(1).max(720).optional(),
      keywords: z.array(z.string()).optional(),
      sentiment_below: z.number().min(-1).max(1).optional(),
      volume_above: z.number().min(1).optional(),
    })
    .optional(),
  notificationChannels: z
    .array(
      z.object({
        type: z.enum(["email", "webhook", "slack"]),
        target: z.string().min(1),
      })
    )
    .optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params;
  const body = await request.json();
  const parsed = updateAlertRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(alertRules)
    .set(parsed.data)
    .where(eq(alertRules.id, ruleId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params;

  const [deleted] = await db
    .delete(alertRules)
    .where(eq(alertRules.id, ruleId))
    .returning({ id: alertRules.id });

  if (!deleted) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
