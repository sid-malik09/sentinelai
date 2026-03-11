import vader from "vader-sentiment";

export interface VaderResult {
  compound: number; // -1 to +1 composite score
  pos: number;
  neu: number;
  neg: number;
}

export function analyzeWithVader(text: string): VaderResult {
  const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(text);
  return {
    compound: intensity.compound,
    pos: intensity.pos,
    neu: intensity.neu,
    neg: intensity.neg,
  };
}

export function compoundToLabel(
  compound: number
): "positive" | "negative" | "neutral" {
  if (compound >= 0.05) return "positive";
  if (compound <= -0.05) return "negative";
  return "neutral";
}
