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
  let target = Game.getObjectById(creep.memory.target);
  let targets
  if (!target) {
    targets = creep.room.find(FIND_STRUCTURES, {
      filter(s) {
         return s.hits < s.hitsMax * 0.85;
      }
    });
    target = creep.pos.findClosestByRange(targets);
  }

  if (target) {
    const range = creep.pos.getRangeTo(target);
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
    yield done({
      noTarget: true,
    });
  }
}
