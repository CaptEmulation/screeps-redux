import {
  needsEnergy,
} from '../../utils/matchers';

export default function* supplyUpgrade(creep, {
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
  let target;

  const containerId = _.get(creep, 'room.memory.bunker.upgradeContainer');
  if (containerId) {
    const container = Game.getObjectById(containerId);
    if (!container) {
      delete creep.room.memory.bunker.upgradeContainer
    } else if (needsEnergy(container)) {
      target = container;
    }
  }
  if (target) {
    const range = creep.pos.getRangeTo(target);
    if (range > 1) {
      creep.routeTo(target, { range: 1 });
    } else {
      const amount = Math.min(creep.carry[RESOURCE_ENERGY], target.storeCapacity - _.sum(target.store));
      creep.transfer(target, RESOURCE_ENERGY, amount);
      delete creep.memory.target;
    }
  } else {
    yield done({
      noTarget: true,
    });
  }
}
