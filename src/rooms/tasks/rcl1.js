import {
  placeConstructionSites,
} from '../planner';


function bootstrapWithNoCreeps(room) {
  const spawns = room.find(FIND_MY_SPAWNS);
  const spawnsWithoutBootstrap = spawns.filter(not(hasTask('bootstrap')));
  spawnsWithoutBootstrap.forEach(spawn => spawn.addTask('bootstrap'));
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
  if (_.get(room, 'memory.bunker.anchor') && Game.time % 5 === 0) {
    placeConstructionSites(room, room.memory.bunker.anchor, 1);
  }
  yield done();
}
