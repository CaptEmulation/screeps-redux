import { createSelector } from 'reselect';


global.getCreeps = function() {
  const creeps = Game.creeps;
  Object.keys(creeps).forEach(function (key) {
    const creep = creeps[key];
    let vitalStats = {};
    vitalStats['task'] = creep.memory.task;
    vitalStats['ticksToLive'] = creep.ticksToLive;
    vitalStats['energy'] = creep.carry['energy'];
    console.log(key + "  \t" + JSON.stringify(vitalStats));
  });
  return "That's all folks!";
}

global.showCreep = function(name) {
  const creep = Game.creeps[name];
  new RoomVisual(creep.room.name).circle(creep.pos, {stroke: "blue", fill: 'transparent', opacity: 1, radius: 1});
  let vitalStats = {};
  vitalStats['task'] = creep.memory.task;
  vitalStats['ticksToLive'] = creep.ticksToLive;
  vitalStats['energy'] = creep.carry['energy'];
  return name + "  \t" + JSON.stringify(vitalStats);
}

export const deadCreeps = (function () {
  const selectMemoryCreeps = ({ Memory }) => Memory.creeps || {};
  const selectGameCreeps = ({ Game }) => Game.creeps || {};
  const selectDeadCreepNames = createSelector(
    selectMemoryCreeps,
    selectGameCreeps,
    (creepsMem, creepsGame) => _.difference(Object.keys(creepsMem), Object.keys(creepsGame))
  );
  return function getDeadCreeps() {
    return selectDeadCreepNames({
      Game,
      Memory,
    })
  }
})();


//   const mOpts = {
//     reusePath: 10,
//     ...opts,
//   };
//   const cachePathErr = creep.moveTo(destination, {
//     ...mOpts,
//     noPathFinding: true,
//   });
//   if (cachePathErr === ERR_NOT_FOUND) {
//     return creep.moveTo(destination, {
//       ...mOpts,
//       visualizePathStyle: { stroke: '#ffffff' }
//     });
//   }
//   return null;


function applyToCreep(task) {
  return (...args) => (creep, target) => {
    const err = creep[task](target, ...args);
    // console.log(`${creep.name}.${task}(${[args.join(', ')]}) => ${err}`)
    return err;
  };
}

export const tasks = {
  attack: applyToCreep('attack'),
  build: applyToCreep('build'),
  upgradeController: applyToCreep('upgradeController'),
  harvest:  applyToCreep('harvest'),
  drop: applyToCreep('drop'),
  pickup: applyToCreep('pickup'),
  repair: applyToCreep('repair'),
  transfer: applyToCreep('transfer'),
  withdraw: applyToCreep('withdraw'),
};

export function findClosestEnergy(creep, dropped = true) {
  const structureSources = creep.room.find(FIND_STRUCTURES, {
    filter(target) {
      if (target.structureType === STRUCTURE_CONTAINER || target.structureType === STRUCTURE_STORAGE) {
        return target.store[RESOURCE_ENERGY] > creep.carryCapacity;
      }
      return false;
    }
  });

  const energySources = dropped ? creep.room.find(FIND_DROPPED_RESOURCES, {
    filter(resource) {
      return resource.amount > creep.carryCapacity && resource.resourceType === RESOURCE_ENERGY;
    }
  }) : [];

  const tombstones = creep.room.find(FIND_TOMBSTONES, {
    filter(tombstone) {
      return tombstone.store[RESOURCE_ENERGY] > 0;
    }
  });

  const sources = [...energySources, ...structureSources, ...tombstones].sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));

  if (sources.length) {
    const source = sources[0];
    let task;
    if (source instanceof Resource) {
      task = tasks.pickup();
    } else if (source instanceof StructureContainer || source instanceof StructureStorage || source instanceof Tombstone) {
      task = tasks.withdraw(RESOURCE_ENERGY);
    } else if (source instanceof Source) {
      task = tasks.harvest();
    }
    return acquireTask(creep, task, source);
  }
}

export function acquireTask(creep, task, target) {
  const result = task(creep, target);
  if (result === ERR_NOT_IN_RANGE) {
    creep.routeTo(target);
  }
  return result;
}
