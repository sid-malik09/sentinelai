import { analyzeWithVader, compoundToLabel } from "./vader";
import { analyzeWithClaude, isClaudeConfigured } from "./claude";
import { db } from "@/lib/db";
import { analyses, mentions } from "@/lib/db/schema";
import { eq, isNull, sql } from "drizzle-orm";

interface AnalysisDecision {
  useDeepAnalysis: boolean;
  reason: string;
}

function shouldUseDeepAnalysis(
  vaderResult: { compound: number },
  mention: {
    engagement?: {
      likes?: number;
      comments?: number;
      views?: number;
      score?: number;
    } | null;
    authorFollowers?: number | null;
    content: string;
  }
): AnalysisDecision {
  // High engagement mentions deserve deep analysis
  const eng = mention.engagement ?? {};
  const engagementScore =
    (eng.likes ?? 0) +
    (eng.comments ?? 0) * 2 +
    (eng.score ?? 0) +
    (eng.views ?? 0) * 0.01;

  if (engagementScore > 100) {
    return { useDeepAnalysis: true, reason: "high_engagement" };
  }

  // Influential authors
  if (mention.authorFollowers && mention.authorFollowers > 5000) {
    return { useDeepAnalysis: true, reason: "influential_author" };
  }

  // Strong sentiment (could be important positive or negative signal)
  if (Math.abs(vaderResult.compound) > 0.7) {
    return { useDeepAnalysis: true, reason: "strong_sentiment" };
  }

  // Long content likely has more nuance
  if (mention.content.length > 500) {
    return { useDeepAnalysis: true, reason: "long_content" };
  }

  return { useDeepAnalysis: false, reason: "standard" };
}

export async function analyzeMentionBatch(
  batchSize: number = 50
): Promise<{
  processed: number;
  vaderCount: number;
  claudeCount: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // Find mentions without analyses using a subquery
  const unanalyzed = await db
    .select()
    .from(mentions)
    .where(
      isNull(
        db
          .select({ id: analyses.id })
          .from(analyses)
          .where(eq(analyses.mentionId, mentions.id))
      )
    )
    .orderBy(mentions.collectedAt)
    .limit(batchSize);

  if (unanalyzed.length === 0) {
    return { processed: 0, vaderCount: 0, claudeCount: 0, errors: [] };
  }

  let vaderCount = 0;
  let claudeCount = 0;
  const claudeAvailable = isClaudeConfigured();

  for (const mention of unanalyzed) {
    try {
      // Tier 1: Always run VADER first (< 1ms, no network)
      const vaderResult = analyzeWithVader(mention.content);
      const decision = shouldUseDeepAnalysis(vaderResult, mention);

      if (decision.useDeepAnalysis && claudeAvailable) {
        // Tier 2: Claude for important mentions
        try {
          const claudeResult = await analyzeWithClaude(mention.content, {
            title: mention.title ?? undefined,
            source: mention.source,
            author: mention.author ?? undefined,
          });

          await db.insert(analyses).values({
            mentionId: mention.id,
            sentimentScore: claudeResult.sentimentScore,
            sentimentLabel: claudeResult.sentimentLabel,
            emotions: claudeResult.emotions,
            topicsExtracted: claudeResult.topicsExtracted,
            keyPhrases: claudeResult.keyPhrases,
            intent: claudeResult.intent,
            entities: claudeResult.entities,
            summary: claudeResult.summary,
            competitiveMention: claudeResult.competitiveMention,
            competitorNames: claudeResult.competitorNames,
            analysisModel: "claude-sonnet",
          });
          claudeCount++;
          continue;
        } catch (err) {
          // Fallback to VADER if Claude fails
          errors.push(
            `Claude fallback for ${mention.id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      // Tier 1 only: Store VADER result
      await db.insert(analyses).values({
        mentionId: mention.id,
        sentimentScore: vaderResult.compound,
        sentimentLabel: compoundToLabel(vaderResult.compound),
        analysisModel: decision.useDeepAnalysis ? "vader-fallback" : "vader",
      });
      vaderCount++;
    } catch (err) {
      errors.push(
        `Analysis error for ${mention.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return {
    processed: unanalyzed.length,
    vaderCount,
    claudeCount,
    errors,
  };
}
