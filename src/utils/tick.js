export function periodically(period) {
  const variance = Math.floor(Math.random() * Math.floor(period));
  return () => Game.time % period === variance;
}
