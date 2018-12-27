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
  let target;
  if (!creep.memory.target) {
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
      const targetIds = creep.room.find(FIND_STRUCTURES, {
        filter: targetMatchers.isContainer,
      });
      if (targetIds) {
        const targets = targetIds.map(id => Game.getObjectById(id));
        let validTargets = [];
        for (let target of targets) {
          //if (_.sum(target.store) > creep.carryCapacity + 100) {
          if (target && target.store && _.sum(target.store) > 300) {
            validTargets.push(target);
          }
        }
        target = _.max(validTargets, t => t.store[RESOURCE_ENERGY]);
      }
    }
  }
  if (target) {
    creep.memory.target = target.id;
  }
  if (target && range > 1) {
    creep.routeTo(target);
  } else if (target && !(target instanceof StructureExtension)) {
    if (target instanceof Resource) {
      creep.pickup(target, RESOURCE_ENERGY);
    } else if (target instanceof Tombstone || target instanceof StructureContainer || target instanceof StructureStorage) {
      creep.withdraw(target, RESOURCE_ENERGY);
    }
  } else {
    yield done();
  }
}
