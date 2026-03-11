import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const claudeAnalysisSchema = z.object({
  sentimentScore: z.number().min(-1).max(1),
  sentimentLabel: z.enum(["positive", "negative", "neutral", "mixed"]),
  emotions: z.record(z.string(), z.number()),
  topicsExtracted: z.array(z.string()),
  keyPhrases: z.array(z.string()),
  intent: z.enum([
    "question",
    "complaint",
    "praise",
    "feature_request",
    "comparison",
    "discussion",
    "other",
  ]),
  entities: z.array(z.object({ name: z.string(), type: z.string() })),
  summary: z.string(),
  competitiveMention: z.boolean(),
  competitorNames: z.array(z.string()),
});

export type ClaudeAnalysisResult = z.infer<typeof claudeAnalysisSchema>;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function analyzeWithClaude(
  content: string,
  context: { title?: string; source: string; author?: string }
): Promise<ClaudeAnalysisResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analyze the following social media mention. Return ONLY valid JSON matching this exact schema (no markdown, no code blocks, just JSON):
{
  "sentimentScore": <float -1 to 1>,
  "sentimentLabel": "positive" | "negative" | "neutral" | "mixed",
  "emotions": {"joy": <0-1>, "anger": <0-1>, "sadness": <0-1>, "fear": <0-1>, "surprise": <0-1>, "disgust": <0-1>},
  "topicsExtracted": ["topic1", "topic2"],
  "keyPhrases": ["phrase1", "phrase2"],
  "intent": "question" | "complaint" | "praise" | "feature_request" | "comparison" | "discussion" | "other",
  "entities": [{"name": "X", "type": "company|product|person|technology"}],
  "summary": "<one sentence summary>",
  "competitiveMention": <boolean>,
  "competitorNames": ["competitor1"]
}

Source: ${context.source}
${context.title ? `Title: ${context.title}` : ""}
Author: ${context.author || "unknown"}

Content:
${content.slice(0, 3000)}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Strip any markdown code blocks if present
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  return claudeAnalysisSchema.parse(parsed);
}
