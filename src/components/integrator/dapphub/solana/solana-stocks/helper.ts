export function formatMarketCap(num: number) {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B MC`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M MC`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K MC`;
  return `$${num.toFixed(0)} MC`;
}