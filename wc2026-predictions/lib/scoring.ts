export function calculatePoints(params: {
  predictedHome: number;
  predictedAway: number;
  actualHome: number | null;
  actualAway: number | null;
  predictedFirstScorer?: string | null;
  actualFirstScorer?: string | null;
}) {
  const { predictedHome, predictedAway, actualHome, actualAway, predictedFirstScorer, actualFirstScorer } = params;
  if (actualHome === null || actualAway === null) return 0;

  const exactScore = predictedHome === actualHome && predictedAway === actualAway;
  const predictedResult = Math.sign(predictedHome - predictedAway);
  const actualResult = Math.sign(actualHome - actualAway);
  const correctResult = predictedResult === actualResult;
  const firstScorerOk = Boolean(
    predictedFirstScorer &&
      actualFirstScorer &&
      predictedFirstScorer.trim().toLowerCase() === actualFirstScorer.trim().toLowerCase()
  );

  let points = 0;
  if (exactScore) points += 6;
  else if (correctResult) points += 3;
  if (firstScorerOk) points += 3;
  if (exactScore && firstScorerOk) points += 2;
  return points;
}
