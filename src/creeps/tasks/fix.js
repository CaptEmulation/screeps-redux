export default function* fix(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === 0) {
    delete creep.memory.target;
    delete creep.memory.range;
    yield done();
  }
  const percent = 0.85;
  let target = Game.getObjectById(creep.memory.target);
  let targets
  if (!target || (!target.hits && !target.hitsMax) || (target.hits === target.hitsMax)) {
    targets = creep.room.find(FIND_STRUCTURES, {
      filter(s) {
         return s.hits < s.hitsMax * percent;
      }
    });
    target = creep.pos.findClosestByRange(targets);
  }

  const range = creep.pos.getRangeTo(target);
  if (target && target.hits < target.hitsMax) {
    if (range > 3) {
      creep.routeTo(target, { range: 3 });
    } else {
      creep.memory.target = target.id;
      creep.memory.range = 3;
      const err = creep.repair(target);
      if (err) {
        yield done();
      }
    }
  } else {
    delete creep.memory.target;
    yield done({
      noTarget: true,
    });
  }
}
