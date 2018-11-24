export function moveTo(creep, target, opts = {}) {
  // console.log(`${creep.name}.moveTo(${target})`)
  const mOpts = {
    reusePath: 15,
    ...opts,
  };
  const cachePathErr = creep.moveTo(target, {
    ...mOpts,
    noPathFinding: true,
  });
  if (cachePathErr === ERR_NOT_FOUND) {
    return creep.moveTo(target, {
      ...mOpts,
      visualizePathStyle: { stroke: '#ffffff' }
    });
  }
  return null;
}

function applyToCreep(task) {
  return (...args) => (creep, target) => {
    const err = creep[task](target, ...args);
    // console.log(`${creep.name}.${task}(${[args.join(', ')]}) => ${err}`)
    return err;
  };
}

export const tasks = {
  build: applyToCreep('build'),
  upgradeController: applyToCreep('upgradeController'),
  harvest:  applyToCreep('harvest'),
  drop: applyToCreep('drop'),
  pickup: applyToCreep('pickup'),
  repair: applyToCreep('repair'),
  transfer: applyToCreep('transfer'),
  withdraw: applyToCreep('withdraw'),
};

export function findClosestEnergy(creep) {
  const structureSources = creep.room.find(FIND_STRUCTURES, {
    filter(target) {
      if (target.structureType === STRUCTURE_CONTAINER) {
        return target.store[RESOURCE_ENERGY] > creep.carryCapacity;
      }
      return false;
    }
  });

  const energySources = creep.room.find(FIND_DROPPED_RESOURCES, {
    filter(resource) {
      return resource.energy > creep.carryCapacity;
    }
  });

  const sources = [...energySources, ...structureSources].sort((a, b) => creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b));

  if (sources.length) {
    const source = sources[0];
    let task;
    if (source instanceof Resource) {
      task = tasks.pickup();
    } else if (source instanceof StructureContainer) {
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
    moveTo(creep, target);
  }
}
