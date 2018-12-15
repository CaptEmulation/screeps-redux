export default function* run({
  // fork,
  creep,
  room,
  task,
  // taskCreators,
  // taskSelectors,
}) {
  const source = Game.getObjectById(task.target);
  let hasContainer = false;
  let container = room.memory.sources && Object.values(room.memory.sources).find(
    sourceData => sourceData.container && sourceData.id === source.id,
  );
  if (!container && container.id) {
    container = Game.getObjectById(container.id);
    if (container) {
      hasContainer = true;
    }
  }
  const target = hasContainer ? container : source;
  const targetRange = creep.pos.getRangeTo(target);
  if (targetRange > 1) {
    return creep.routeTo({
      target,
      range: 1,
    });
  }
  const creepCarry = _.sum(creep.carry);
  if (creepCarry <= creep.carryCapacity) {
    return creep.harvest(source);
  }
  // Full, drop or store energy
  if (container) {
    return  creep.transfer(container, RESOURCE_ENERGY, creep.carry[RESOURCE_ENERGY]);
  }
  return creep.drop(RESOURCE_ENERGY);
}
