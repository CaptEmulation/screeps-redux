import {
  and,
  target as targetMatchers,
} from '../utils/matchers';


function assignMostEnergySource({ creep, context }) {
  const sources = creep.room.find(FIND_SOURCES);
  const source = _.max(sources, source => source.energy);
  if (source) {
    context.sourceId = source.id;
  }
}

function assignClosestEnergySource({ creep, context }) {
  const sources = creep.room.find(FIND_SOURCES);
  const source = creep.pos.findClosestByRange(sources);
  if (source) {
    context.sourceId = source.id;
  }
}

export function* pioneer(creep, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === creep.carryCapacity) {
    const results = yield subTask(supplySpawn);
    if (_.get(results, 'targets.length') === 0) {
      yield subTask(upgradeController);
    }
  } else {
    return yield subTask(harvest);
  }
}

export function* renewSelf(creep, {
  done,
  priority,
  context,
}) {
  if (!context.spawnId) {
    const targets = creep.room.find(FIND_STRUCTURES, {
      filter: targetMatchers.isSpawn,
    });
    if (targets.length) {
      context.spawnId = creep.pos.findClosestByRange(targets).id;
    }
  }
  const target = Game.getObjectById(context.spawnId);
  if (!target) {
    // Can't find a spawn to renew at
    yield priority(Infinity);
  } else if (context.isRenewing) {
    // Hold priority while renewing
    yield priority(context.isRenewing);
  } else {
    // priority goes up as tick gets closer to death
    yield priority(-200 + creep.ticksToLive);
  }
  context.isRenewing = context.isRenewing || -200 + creep.ticksToLive;
  if (creep.ticksToLive > 1350) {
    delete context.isRenewing;
    delete creep.memory.target;
    yield done();
  }


  const range = creep.pos.getRangeTo(target);
  if (range > 1) {
    creep.routeTo(target, { range: 1 });
  } else {
    creep.memory.target = target.id;
    target.renewCreep(creep);
  }
}

export function* harvest(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === creep.carryCapacity) {
    delete creep.memory.target;
    return yield done();
  }
  if (!context.sourceId) {
    assignClosestEnergySource({ creep, context });
  }
  const source = Game.getObjectById(context.sourceId);
  const range = creep.pos.getRangeTo(source);
  if (range > 1) {
    creep.routeTo(source, { range: 1 });
  } else {
    creep.memory.target = source.id;
    creep.harvest(source);
  }
}

export function* upgradeController(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === 0) {
    delete creep.memory.target;
    delete creep.memory.range;
    yield done();
  }
  const target = creep.room.controller;
  if (!target) {
    yield done();
  }
  const range = creep.pos.getRangeTo(target);
  if (range > 3) {
    creep.routeTo(target, { range: 3 });
  } else {
    creep.memory.target = target.id;
    creep.memory.range = 3;
    creep.upgradeController(target);
  }
}

export function* supplySpawn(creep, {
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

export function* dropResources(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === 0) {
    return yield done();
  }
  const resourceType = _.max(Object.entries(creep.carry), ([type, amount]) => amount)[0];
  creep.drop(resourceType);
}

export function* patrol(creep, {
  priority,
  done,
  context,
}) {
  if (!context.locs) {
    throw new Error('Locations (locs) not defined');
  }
  yield priority(-1);
  if (!context.i) {
    context.i = 0;
  }
  let target = new RoomPosition(...context.locs[context.i]);
  const range = creep.pos.getRangeTo(target);
  if (range <= 1) {
    if (context.i >= (context.locs.length - 1)) {
      context.i = 0;
    } else {
      context.i++
    }
    target = new RoomPosition(...context.locs[context.i]);
  }
  if (range > 0) {
    creep.routeTo(target);
  }
}

export const handlers = {
  pioneer,
  harvest,
  supplySpawn,
  dropResources,
  upgradeController,
  renewSelf,
};
