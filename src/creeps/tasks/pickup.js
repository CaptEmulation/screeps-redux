import {
  and,
  or,
  needsEnergy,
  target as targetMatchers,
} from '../../utils/matchers'

function targetHasEnergy(target) {
  if (target instanceof Tombstone || target instanceof StructureContainer || target instanceof StructureStorage) {
    return target.store[RESOURCE_ENERGY] > 0;
  } else if (target instanceof Resource) {
    return target.amount > 0;
  }
}

function findBunkerEnergy(creep) {
  const sourceContainers = _.get(creep, 'room.memory.bunker.containers', [])
    .map(s => Game.getObjectById(s))
    .filter(s => !!s && s.store[RESOURCE_ENERGY] > 100);
  return _.maxBy(sourceContainers, t => t.store[RESOURCE_ENERGY]);
}

export default function* pickup(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority(context.priority);
  if (_.sum(creep.carry) === creep.carryCapacity) {
    return yield done();
  }
  let target = Game.getObjectById(creep.memory.target);
  const hostiles = creep.room.find(FIND_HOSTILE_CREEPS).length;
  if (target && !targetHasEnergy(target) || hostiles) {
    delete creep.memory.target;
    target = null;
  }
  if (!target) {
    if (creep.room.find(FIND_STRUCTURES, {
      filter: and(
        or(
          targetMatchers.isMyTower,
          targetMatchers.isMySpawn,
          targetMatchers.isMyExtension,
        ),
        needsEnergy,
      ),
    }).length > 0) {
      target = findBunkerEnergy(creep);
      if (!target) {
        const targets = creep.room.find(FIND_STRUCTURES, {
          filter(structure) {
            return (structure.structureType === STRUCTURE_STORAGE || structure.structureType === STRUCTURE_CONTAINER) && structure.store[RESOURCE_ENERGY] > 0;
          }
        });
        if (targets.length) {
          target = creep.pos.findClosestByRange(targets);
        }
      }
    }
    if (!target && !hostiles) {
      const energySources = creep.room.find(FIND_DROPPED_RESOURCES, {
        filter(resource) {
          return resource.resourceType === RESOURCE_ENERGY && resource.amount > 50;
        }
      });
      const tombstones = creep.room.find(FIND_TOMBSTONES, {
        filter(tombstone) {
          return tombstone.store[RESOURCE_ENERGY] > 0;
        }
      });
      target = creep.pos.findClosestByRange([...energySources, ...tombstones]);
    }

    if (!target) {
      const sourceContainers = _.get(creep, 'room.memory.sources', [])
        .map(s => Game.getObjectById(s.containerId))
        .filter(s => !!s && s.store[RESOURCE_ENERGY] > 100);
      target = _.maxBy(sourceContainers, t => t.store[RESOURCE_ENERGY]);
    }
    if (!target) {
      target = findBunkerEnergy(creep);
    }
  }
  if (target) {
    creep.memory.target = target.id;
  }
  if (target && creep.pos.getRangeTo(target) > 1) {
    creep.routeTo(target, { range: 1 });
  } else if (target && !(target instanceof StructureExtension)) {
    if (target instanceof Resource) {
      creep.pickup(target, RESOURCE_ENERGY);
      delete creep.memory.target;
    } else if (target instanceof Tombstone || target instanceof StructureContainer || target instanceof StructureStorage) {
      creep.withdraw(target, RESOURCE_ENERGY);
      delete creep.memory.target;
    }
  } else {
    yield done({
      noTarget: true,
    });
  }
}
