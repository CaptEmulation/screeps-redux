import {
  target as targetMatchers,
} from '../../utils/matchers';

export default function* renewSelf(creep, {
  done,
  priority,
  sleep,
  context,
}) {
  if (!context.spawnId) {
    const targets = creep.room.find(FIND_STRUCTURES, {
      filter: targetMatchers.isSpawn,
    });
    if (targets.length) {
      context.spawnId = creep.pos.findClosestByRange(targets).id;
    }
  }
  const target = Game.getObjectById(context.spawnId);
  if (!target) {
    // Can't find a spawn to renew at
    yield sleep();
  } else {
    // Default 1 priority
    yield priority(context.priority || 1);
  }

  const range = creep.pos.getRangeTo(target);
  if (range > 1) {
    creep.routeTo(target, { range: 1 });
  } else {
    creep.memory.target = target.id;
    target.recycleCreep(creep);
  }
}
