import {
  placeConstructionSites,
} from '../planner';


export default function* rcl1(room, {
  priority,
  subTask,
  context,
  done,
}) {
  yield priority();
  if (_.get(room, 'memory.bunker.anchor') && Game.time % 5 === 0) {
    placeConstructionSites(room, room.memory.bunker.anchor, 1);
  }
  if (Game.time % 19) {
    room.find(FIND_MY_SPAWNS).forEach(spawn => spawn.addTask('bootstrap'));
  }
  yield done();
}
