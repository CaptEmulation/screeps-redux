export function ensureBuilder(room) {
  const spawns = room.find(FIND_MY_SPAWNS);
  const spawnsWithoutBuilder = spawns.filter(not(hasTask('builder')));
  if (spawnsWithoutBuilder.length) {
    spawnsWithoutBuilder.forEach(spawn => spawn.addTask('builder'));
  }
}
