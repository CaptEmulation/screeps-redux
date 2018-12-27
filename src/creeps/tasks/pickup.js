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
  if (!target) {
    if (creep.room.find(FIND_STRUCTURES, {
      filter(structure){
        return (structure.structureType === STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
      }
    }).length > 0) {
      const targets = creep.room.find(FIND_STRUCTURES, {
        filter(structure) {
          return (structure.structureType === STRUCTURE_STORAGE || structure.structureType === STRUCTURE_CONTAINER) && structure.store[RESOURCE_ENERGY] > 0;
        }
      });
      if (targets.length) {
        target = creep.pos.findClosestByRange(targets);
      }
    }
    if (!target) {
      const energySources = creep.room.find(FIND_DROPPED_RESOURCES, {
        filter(resource) {
          return resource.resourceType === RESOURCE_ENERGY;
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
        .filter(s => s.containerId)
        .map(s => Game.getObjectById(s))
        .filter(s => !!s && s.store[RESOURCE_ENERGY] > 100);
      target = _.maxBy(sourceContainers, t => t.store[RESOURCE_ENERGY]);
    }
  }
  if (target) {
    creep.memory.target = target.id;
  }
  if (target && creep.pos.getRangeTo(target) > 1) {
    creep.routeTo(target);
  } else if (target && !(target instanceof StructureExtension)) {
    if (target instanceof Resource) {
      creep.pickup(target, RESOURCE_ENERGY);
    } else if (target instanceof Tombstone || target instanceof StructureContainer || target instanceof StructureStorage) {
      creep.withdraw(target, RESOURCE_ENERGY);
    }
  } else {
    yield done({
      noTarget: true,
    });
  }
}
