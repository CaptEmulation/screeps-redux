import {
  getSourceId,
} from './common';

export default function* dropMiner(creep, {
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
  let container;
  if (_.sum(creep.carry) > 0.8 * creep.carryCapacity) {
    // Look for container
    if (creep.room.memory.sources) {
      const mySourceDef = creep.room.memory.sources.find(s => s.id === context.sourceId);
      if (mySourceDef) {
        const { containerId } = mySourceDef;
        container = Game.getObjectById(containerId);
        if (container) {
          creep.routeTo(container, { range: 1 });
        }
      }
    }
    if (!container) {
      biggestDrop = _.maxBy(creep.pos.findInRange(creep.room.find(FIND_DROPPED_RESOURCES, {
        filter(resource) {
          return resource.resourceType === RESOURCE_ENERGY;
        },
      }), 1), drop => drop.amount);
      if (biggestDrop) {
        creep.routeTo(biggestDrop, { range: 0 });
      }
    }
  }
  if (container && container.pos.getRangeTo(creep.pos) <= 1) {
    const amount = Math.min(container.storeCapacity - _.sum(container.store), creep.carry[RESOURCE_ENERGY]);
    creep.transfer(container, RESOURCE_ENERGY, amount);
  } else if (_.sum(creep.carry) === creep.carryCapacity && (!biggestDrop ||  biggestDrop.pos.getRangeTo(creep.pos) === 0)) {
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
