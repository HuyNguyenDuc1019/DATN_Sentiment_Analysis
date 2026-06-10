/** Compute dashboard statistics from prediction results */
export function computeStats(results) {
  if (!results || !results.length) {
    return { total: 0, positive: 0, negative: 0, avgConfidence: 0, positiveRate: 0, negativeRate: 0 };
  }
  const total = results.length;
  const positive = results.filter((r) => r.prediction === 1).length;
  const negative = total - positive;
  const avgConfidence = results.reduce((acc, r) => acc + r.confidence, 0) / total;
  
  return {
    total,
    positive,
    negative,
    avgConfidence,
    positiveRate: (positive / total) * 100,
    negativeRate: (negative / total) * 100,
  };
}

/** Format confidence score to percentage string */
export const fmtPct = (val, decimals = 1) => `${(val * 100).toFixed(decimals)}%`;

/** Format large numbers with commas */
export const fmtNum = (n) => n.toLocaleString('vi-VN');