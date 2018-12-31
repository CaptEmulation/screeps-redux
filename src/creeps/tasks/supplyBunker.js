import {
  and,
  needsEnergy,
  target as targetMatchers,
} from '../../utils/matchers';

export default function* supplyBunker(creep, {
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
  let targets;
  if (_.get(creep, 'room.memory.bunker.containers')) {
    targets = creep.room.memory.bunker.containers
      .map(c => Game.getObjectById(c))
      .filter(c => !!c && needsEnergy(c));
    if (targets.length) {
      target = creep.pos.findClosestByRange(targets);
    }
  }

  // Needs a new task... causes weird behavior here
  // if (!target) {
  //   targets = creep.room.find(FIND_MY_STRUCTURES, {
  //     filter: and(targetMatchers.isStorage, needsEnergy),
  //   });
  //   if (targets.length) {
  //     target = creep.pos.findClosestByRange(targets);
  //   }
  // }

  if (target) {
    const range = creep.pos.getRangeTo(target);
    if (range > 1) {
      creep.routeTo(target, { range: 1 });
    } else {
      const amount = Math.min(creep.carry[RESOURCE_ENERGY], target.storeCapacity - _.sum(target.store));
      creep.transfer(target, RESOURCE_ENERGY, amount);
      yield done();
      delete creep.memory.target;
    }
  } else {
    yield done({
      noTarget: true,
    });
  }
}
