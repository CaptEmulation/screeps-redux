import {
  and,
  target as targetMatchers,
} from '../../utils/matchers';

export default function* supplySpawn(creep, {
  priority,
  done,
  moveTo,
  subTask,
  context,
}) {
  yield priority();
  if (creep.carry[RESOURCE_ENERGY] === 0) {
    delete creep.memory.target;
    return yield done();
  }
  const targets = creep.room.find(FIND_MY_STRUCTURES, {
    filter: and(
      targetMatchers.isSpawnSupply,
      targetMatchers.needsEnergy,
    ),
  });
  if (targets.length) {
    const target = creep.pos.findClosestByRange(targets);
    const range = creep.pos.getRangeTo(target);
    if (range > 1) {
      creep.routeTo(target, { range: 1 });
    } else {
      const amount = Math.min(creep.carry[RESOURCE_ENERGY], target.energyCapacity - target.energy);
      creep.transfer(target, RESOURCE_ENERGY, amount);
      creep.memory.target = target.id;
    }
  } else {
    yield done({
      targets,
    });
  }
}
