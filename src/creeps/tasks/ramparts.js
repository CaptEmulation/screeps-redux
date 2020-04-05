export default function* ramparts(creep, {
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
  if (!target || target.structureType !== STRUCTURE_RAMPART) {
    targets = creep.room.find(FIND_STRUCTURES, {
      filter(s) {
         return STRUCTURE_RAMPART === s.structureType && s.hits < 500;
      }
    }).sort((a, b) => a.hits - b.hits);

    target = targets[0];
  }

  const range = creep.pos.getRangeTo(target);
  if (target && creep.carry.energy > 0) {
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
