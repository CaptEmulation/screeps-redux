import {
  needsEnergy,
} from '../../utils/matchers';

export default function* fillFromBunker(creep, {
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
  let target = Game.getObjectById(creep.memory.target);
  if (!(target instanceof StructureContainer || target instanceof StructureStorage)) {
    delete creep.memory.target;
    target = null;
  }
  if (!target || !target.store || target.store[RESOURCE_ENERGY] === 0) {
    target = null;
    delete creep.memory.target;
    if (_.get(creep, 'room.memory.bunker.containers')) {
      targets = creep.room.memory.bunker.containers
        .map(c => Game.getObjectById(c))
        .filter(c => !!c && c.store && c.store[RESOURCE_ENERGY] > 0);
      if (targets.length) {
        target = _.maxBy(targets, target => target.store[RESOURCE_ENERGY] / target.pos.getRangeTo(creep.pos));
      }
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
