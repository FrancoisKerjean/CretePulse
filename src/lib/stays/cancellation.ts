export function daysUntil(checkIn: string): number {
  const target = new Date(checkIn + "T00:00:00Z").getTime();
  const now = Date.now();
  return Math.floor((target - now) / 86_400_000);
}

export function computeRefund(totalPrice: number, days: number): number {
  if (days > 14) return totalPrice;
  if (days >= 2) return Math.round(totalPrice * 0.5 * 100) / 100;
  return 0;
}
