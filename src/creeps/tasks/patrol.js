export default function* patrol(creep, {
  priority,
  done,
  context,
}) {
  if (!context.locs) {
    throw new Error('Locations (locs) not defined');
  }
  yield priority(-1);
  if (!context.i) {
    context.i = 0;
  }
  let target = new RoomPosition(...context.locs[context.i]);
  const range = creep.pos.getRangeTo(target);
  if (range <= 1) {
    if (context.i >= (context.locs.length - 1)) {
      context.i = 0;
    } else {
      context.i++
    }
    target = new RoomPosition(...context.locs[context.i]);
  }
  if (range > 0) {
    creep.routeTo(target);
  }
}
