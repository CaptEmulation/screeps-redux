import {
  and,
  needsEnergy,
  target as targetMatchers,
} from '../../utils/matchers';

export default function* fillFromContainer(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority(context.priority);
  if (_.sum(creep.carry) === creep.carryCapacity) {
    return yield done();
  }
  let targets;
  let target = Game.getObjectById(context.container) || Game.getObjectById(creep.memory.target);
  if (!target || target.store[RESOURCE_ENERGY] === 0) {
    target = null;
    delete creep.memory.target;
    targets = creep.room.find(FIND_STRUCTURES, {
      filter: and(targetMatchers.isContainer,  c => c.store && c.store[RESOURCE_ENERGY] > 0)
    });
    if (targets.length) {
      target = _.maxBy(targets, target => target.store[RESOURCE_ENERGY] / target.pos.getRangeTo(creep.pos));
    }
  }
  if (target) {
    creep.memory.target = target.id;
  }
  if (target && creep.pos.getRangeTo(target) > 1) {
    creep.routeTo(target);
  } else if (target instanceof StructureContainer || target instanceof StructureStorage) {
    creep.withdraw(target, RESOURCE_ENERGY);
  } else {
    yield done({
      noTarget: true,
    });
  }
}
