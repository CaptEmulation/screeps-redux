import {
  and,
  needsEnergy,
  target as targetMatchers,
} from '../../utils/matchers';

export default function* supplySpawn(creep, {
  priority,
  done,
  context,
}) {
  yield priority();
  if (creep.carry[RESOURCE_ENERGY] === 0) {
    return yield done();
  }
  let target;
  if (context.target) {
    target = Game.getObjectById(context.target);
    if (!target || !needsEnergy(target)) {
      target = null;
    }
  }
  if (!target) {
    const targets = creep.room.find(FIND_MY_STRUCTURES, {
      filter: and(
        targetMatchers.isSpawnSupply,
        targetMatchers.needsEnergy,
      ),
    });
    target = creep.pos.findClosestByRange(targets);
  }

  if (target) {
    context.target = target.id;
    const range = creep.pos.getRangeTo(target);
    if (range > 1) {
      creep.routeTo(target, { range: 1 });
    } else {
      const amount = Math.min(creep.carry[RESOURCE_ENERGY], target.energyCapacity - target.energy);
      creep.transfer(target, RESOURCE_ENERGY, amount);
      delete context.target;
    }
  } else {
    yield done({
      noTarget: true,
    });
  }
}
