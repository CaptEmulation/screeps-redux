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
  let target;
  if (!context.sourceId) {
    context.sourceId = getSourceId(creep);
  }
  if (context.sourceId) {
    target = Game.getObjectById(context.sourceId);
  }
  if (context.waiting > 10) {
    context.sleepUntil = Game.time + 20;
    delete creep.memory.target;
  }
  if (context.sleepUntil) {
    if (context.sleepUntil > Game.time && (!target || target && target.pos.getRangeTo(creep.pos) > 1)) {
      return yield sleep();
    } else {
      delete context.waiting;
      delete context.sleepUntil;
    }
  }
  if (target || creep.room) {
    yield priority();
  } else {
    yield sleep();
  }

  if (context.room && context.room !== creep.room.name) {
    return creep.routeTo(new RoomPosition(24, 24, context.room));
  }

  if (context.room && target.room.name !== context.room) {
    context.sourceId = getSourceId(creep);
    if (context.sourceId) {
      target = Game.getObjectById(context.sourceId);
    }
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
      if (range < 3 && range > 1) {
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
