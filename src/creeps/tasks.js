import {
  and,
  target as targetMatchers,
} from '../utils/matchers';
import {
  findWorkSites,
} from '../utils/find';
import {
  walkBox,
} from '../utils/scan';


function assignMostEnergySource({ sources, creep, context }) {
  const source = _.max(sources, source => source.energy);
  if (source) {
    context.sourceId = source.id;
  }
}

function assignClosestEnergySource({ sources, creep, context }) {
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

function freeSpotsAtSource(source) {
  const terrain = new Room.Terrain(source.room.name);
  return [...walkBox(source.pos, 1)].filter(([x, y]) => terrain.get(x, y) !== 1);
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
  let target;
  if (!context.sourceId && creep.room.memory.sources && creep.room) {
    if (_.isUndefined(creep.room.memory.lastSource)) {
      creep.room.memory.lastSource = 0;
    }
    const sources = creep.room.memory.sources;
    let index = creep.room.memory.lastSource;
    do {
      index++;
      if (index >= sources.length) {
        index = 0;
      }
      const sourceCheck = Game.getObjectById(sources[index].id);
      if (freeSpotsAtSource(sourceCheck).find(spot => new RoomPosition(...spot, creep.room.name).lookFor(LOOK_CREEPS).length === 0)) {
        target = sourceCheck;
        creep.room.memory.lastSource = index;
        context.sourceId = sourceCheck.id;
      }
      if (!target && index === creep.room.memory.lastSource){
        break;
      }
    } while (!target)
  } else if (context.sourceId) {
    target = Game.getObjectById(context.sourceId);
  }
  if (target) {
    const range = creep.pos.getRangeTo(target);
    if (range > 1) {
      creep.routeTo(target, { range: 1 });
    } else {
      creep.harvest(target);
    }
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

export function* builder(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  const myConstructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  if (_.sum(creep.carry) === creep.carryCapacity && myConstructionSites.length) {
    yield subTask(construct);
  } else if (context.early){
    return yield subTask(harvest);
  } else {
    throw new Exception('Please tell me how to get stuff for midgame');
  }
}

export function* construct(creep, {
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
  const myConstructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  if (!myConstructionSites.length) {
    yield done();
  }
  const target = findWorkSites(creep.room);
  const range = creep.pos.getRangeTo(target);
  if (range > 3) {
    creep.routeTo(target, { range: 3 });
  } else {
    creep.memory.target = target.id;
    creep.memory.range = 3;
    creep.build(target);
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
