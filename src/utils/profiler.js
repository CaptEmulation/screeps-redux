export default function (name, func, period = 25) {
  const active = Game.time % period === 0;
  let now;
  if (active) {
    now = Game.cpu.getUsed();
  }
  const ret = func();
  if (active) console.log(name, Game.cpu.getUsed() - now);
  return ret;
}
