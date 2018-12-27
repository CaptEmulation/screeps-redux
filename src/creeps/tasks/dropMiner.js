import {
  freeSpotsAtSource,
} from './common';

export default function* dropMining(creep, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  let target;
  if (!context.sourceId) {
    context.sourceId = getSourceId(creep);
  }
  if (context.sourceId) {
    target = Game.getObjectById(context.sourceId);
  }
  let biggestDrop;
  if (_.sum(creep.carry) > 0.8 * creep.carryCapacity) {
    biggestDrop = _.max(creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
      filter(resource) {
        return resource.resoureType === RESOURCE_ENERGY;
      },
    }), drop => drop.amount);
    if (biggestDrop) {
      creep.routeTo(biggestDrop);
    }
  }
  if (_.sum(creep.carry) === creep.carryCapacity && (!biggestDrop ||  biggestDrop.pos.getRangeTo(creep.pos) === 0)) {
    delete creep.memory.target;
    creep.drop(RESOURCE_ENERGY);
  } else {
    if (creep.pos.getRangeTo(target) > 1) {
      creep.routeTo(target);
    }
    creep.harvest(target);
    creep.memory.target = target.id;
  }
}
