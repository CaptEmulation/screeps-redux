function bootstrapWithNoCreeps(room) {
  const spawns = room.find(FIND_MY_SPAWNS);
  const spawnsWithoutBootstrap = spawns.filter(not(hasTask('bootstrap')));
  if (spawnsWithoutBootstrap.length) {
    const myCreepsInRoom = room.find(FIND_MY_CREEPS);
    const hostileCreepsInRoom = room.find(FIND_HOSTILE_CREEPS);
    // Make this better...
    if (room.name === 'sim' || myCreepsInRoom.length === 0 && hostileCreepsInRoom.length === 0) {
      spawnsWithoutBootstrap.forEach(spawn => spawn.addTask('bootstrap'));
      return true;
    }
  }
  return false;
}

export default function* rcl1(room, {
  priority,
  subTask,
  context,
  done,
}) {
  yield priority();
  bootstrapWithNoCreeps(room);
  yield done();
}
