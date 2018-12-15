export default function* run({
  fork,
  creep,
  room,
  task,
  taskCreators,
  // taskSelectors,
}) {
  const target = Game.getObjectById(task.target);
  let done = true;
  if (target) {
    const targetRange = creep.pos.getRangeTo(target);
    if (targetRange > 1) {
      return creep.routeTo({
        target,
        range: 1,
      });
    }
    if (target instanceof Resource) {
      return creep.pickup(target, RESOURCE_ENERGY)
    } else  if (target instanceof StructureContainer) {
      return creep.withdraw(target, RESOURCE_ENERGY);
    }
  } else {
    const nearbyResources = room.find(FIND_DROPPED_RESOURCES, {
      filter(resource) {
        return resource.resourceType === RESOURCE_ENERGY && resource.pos.getRangeTo(creep) <= 4;
      }
    });
    if (nearbyResources) {
      return creep.pickup(target);
    }
  }

  const creepCarry = _.sum(creep.carry);
  if ((done && creepCarry > 0) || creepCarry >= creep.carryCapacity) {
    return fork(taskCreators.deliver());
  }
}
