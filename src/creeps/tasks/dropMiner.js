import {
  freeSpotsAtSource,
  getSourceId,
} from './common';

export default function* dropMiner(creep, {
  priority,
  sleep,
  subTask,
  context,
}) {
  if (context.waiting > 10) {
    context.sleepUntil = Game.time + 50;
  }
  if (context.sleepUntil) {
    if (context.sleepUntil > Game.time) {
      return yield sleep();
    } else {
      delete context.sleepUntil;
    }
  }
  let target;
  if (!context.sourceId) {
    context.sourceId = getSourceId(creep);
  }
  if (context.sourceId) {
    target = Game.getObjectById(context.sourceId);
  }
  if (target) {
    yield priority();
  } else {
    yield sleep();
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
    delete creep.memory.target;
  } else if (_.sum(creep.carry) === creep.carryCapacity && (!biggestDrop ||  biggestDrop.pos.getRangeTo(creep.pos) === 0)) {
    creep.drop(RESOURCE_ENERGY);
  } else if (target) {
    const range = creep.pos.getRangeTo(target);
    if (range > 1) {
      creep.routeTo(target, { range: 1 });
      if (range < 3) {
        context.waiting = context.waiting || 0;
        context.waiting++;
      }
    }
    const err = creep.harvest(target);
    creep.memory.target = target.id;
    if (!err) {
      delete context.waiting;
    }
  }
}
