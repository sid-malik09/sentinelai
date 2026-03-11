declare module "vader-sentiment" {
  interface PolarityScores {
    compound: number;
    pos: number;
    neu: number;
    neg: number;
  }

  const SentimentIntensityAnalyzer: {
    polarity_scores(text: string): PolarityScores;
  };

  export default { SentimentIntensityAnalyzer };
}
