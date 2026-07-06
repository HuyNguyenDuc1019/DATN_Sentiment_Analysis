export function normalizeConfidence(value) {
  const number = Number(value) || 0;
  return number > 1 ? number / 100 : number;
}
