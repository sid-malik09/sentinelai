import { db } from "@/lib/db";
import { alertRules, alerts, mentions, analyses } from "@/lib/db/schema";
import { eq, gte, and, sql, count } from "drizzle-orm";

interface AlertRuleRow {
  id: string;
  projectId: string;
  name: string;
  ruleType: string;
  conditions: {
    threshold?: number;
    window_hours?: number;
    keywords?: string[];
    sentiment_below?: number;
    volume_above?: number;
  };
  notificationChannels: { type: "email" | "webhook" | "slack"; target: string }[];
  isActive: boolean;
}

interface EvaluationResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  severity: string;
  summary: string;
  data: Record<string, unknown>;
}

function determineSeverity(
  ruleType: string,
  conditions: AlertRuleRow["conditions"],
  value: number
): string {
  switch (ruleType) {
    case "sentiment_drop": {
      const threshold = conditions.sentiment_below ?? -0.3;
      if (value < threshold - 0.3) return "critical";
      if (value < threshold - 0.1) return "high";
      return "medium";
    }
    case "volume_spike": {
      const threshold = conditions.volume_above ?? 50;
      if (value > threshold * 3) return "critical";
      if (value > threshold * 2) return "high";
      return "medium";
    }
    case "keyword_alert":
      return "medium";
    default:
      return "low";
  }
}

async function evaluateSentimentDrop(
  rule: AlertRuleRow
): Promise<EvaluationResult> {
  const windowHours = rule.conditions.window_hours ?? 24;
  const threshold = rule.conditions.sentiment_below ?? -0.3;
  const since = new Date(Date.now() - windowHours * 3600000);

  const result = await db
    .select({
      avg: sql<number>`avg(${analyses.sentimentScore})`,
      cnt: sql<number>`count(*)`,
    })
    .from(analyses)
    .innerJoin(mentions, eq(analyses.mentionId, mentions.id))
    .where(gte(mentions.collectedAt, since));

  const avg = result[0]?.avg;
  const mentionCount = Number(result[0]?.cnt ?? 0);

  if (avg == null || mentionCount < 3) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: false,
      severity: "low",
      summary: "Not enough data",
      data: { avg, mentionCount },
    };
  }

  const triggered = avg < threshold;
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    triggered,
    severity: triggered ? determineSeverity("sentiment_drop", rule.conditions, avg) : "low",
    summary: triggered
      ? `Average sentiment dropped to ${avg.toFixed(2)} (threshold: ${threshold}) across ${mentionCount} mentions in the last ${windowHours}h`
      : `Sentiment is ${avg.toFixed(2)}, above threshold ${threshold}`,
    data: { avgSentiment: avg, mentionCount, threshold, windowHours },
  };
}

async function evaluateVolumeSpike(
  rule: AlertRuleRow
): Promise<EvaluationResult> {
  const windowHours = rule.conditions.window_hours ?? 24;
  const threshold = rule.conditions.volume_above ?? 50;
  const since = new Date(Date.now() - windowHours * 3600000);

  const result = await db
    .select({ cnt: count() })
    .from(mentions)
    .where(gte(mentions.collectedAt, since));

  const mentionCount = Number(result[0]?.cnt ?? 0);
  const triggered = mentionCount > threshold;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    triggered,
    severity: triggered ? determineSeverity("volume_spike", rule.conditions, mentionCount) : "low",
    summary: triggered
      ? `Mention volume spiked to ${mentionCount} (threshold: ${threshold}) in the last ${windowHours}h`
      : `Volume is ${mentionCount}, below threshold ${threshold}`,
    data: { mentionCount, threshold, windowHours },
  };
}

async function evaluateKeywordAlert(
  rule: AlertRuleRow
): Promise<EvaluationResult> {
  const windowHours = rule.conditions.window_hours ?? 24;
  const keywords = rule.conditions.keywords ?? [];
  const since = new Date(Date.now() - windowHours * 3600000);

  if (keywords.length === 0) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered: false,
      severity: "low",
      summary: "No keywords configured",
      data: {},
    };
  }

  // Search for mentions containing any of the keywords
  const keywordConditions = keywords.map(
    (kw) => sql`lower(${mentions.content}) like lower(${"%" + kw + "%"})`
  );

  const result = await db
    .select({
      cnt: count(),
    })
    .from(mentions)
    .where(
      and(
        gte(mentions.collectedAt, since),
        sql`(${sql.join(keywordConditions, sql` OR `)})`
      )
    );

  const matchCount = Number(result[0]?.cnt ?? 0);
  const threshold = rule.conditions.threshold ?? 1;
  const triggered = matchCount >= threshold;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    triggered,
    severity: triggered ? "medium" : "low",
    summary: triggered
      ? `Found ${matchCount} mentions matching keywords [${keywords.join(", ")}] in the last ${windowHours}h`
      : `No significant keyword matches (${matchCount}/${threshold})`,
    data: { matchCount, keywords, threshold, windowHours },
  };
}

export async function evaluateAllRules(): Promise<{
  evaluated: number;
  triggered: number;
  errors: string[];
}> {
  const errors: string[] = [];

  const activeRules = await db
    .select()
    .from(alertRules)
    .where(eq(alertRules.isActive, true));

  if (activeRules.length === 0) {
    return { evaluated: 0, triggered: 0, errors: [] };
  }

  let triggered = 0;

  for (const rule of activeRules) {
    try {
      let result: EvaluationResult;

      switch (rule.ruleType) {
        case "sentiment_drop":
          result = await evaluateSentimentDrop(rule as AlertRuleRow);
          break;
        case "volume_spike":
          result = await evaluateVolumeSpike(rule as AlertRuleRow);
          break;
        case "keyword_alert":
          result = await evaluateKeywordAlert(rule as AlertRuleRow);
          break;
        default:
          errors.push(`Unknown rule type: ${rule.ruleType} for rule ${rule.id}`);
          continue;
      }

      if (result.triggered) {
        // Check for duplicate: don't fire the same rule more than once per hour
        const oneHourAgo = new Date(Date.now() - 3600000);
        const recentAlerts = await db
          .select({ cnt: count() })
          .from(alerts)
          .where(
            and(
              eq(alerts.ruleId, rule.id),
              gte(alerts.triggeredAt, oneHourAgo)
            )
          );

        if (Number(recentAlerts[0]?.cnt ?? 0) > 0) {
          continue; // Skip duplicate
        }

        await db.insert(alerts).values({
          ruleId: rule.id,
          severity: result.severity,
          summary: result.summary,
          data: result.data,
        });
        triggered++;
      }
    } catch (err) {
      errors.push(
        `Error evaluating rule ${rule.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { evaluated: activeRules.length, triggered, errors };
}
