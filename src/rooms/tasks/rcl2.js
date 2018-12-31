import {
  ensureBuilder,
  ensureQueen,
  ensureDropMiner,
} from './common';
import {
  placeConstructionSites,
  placeSourceContainers,
  placeUpgradeContainer
} from '../planner';


export default function* rcl2(room, {
  priority,
  subTask,
  context,
  done,
}) {
  yield priority();
  if (_.get(room, 'memory.bunker.anchor') && Game.time % 25 === 0) {
    placeConstructionSites(room, room.memory.bunker.anchor, 2)
    if (_.get(room, 'memory.bunker.containers.length') ===  1) {
      ensureQueen(room);
      ensureDropMiner(room);
      placeUpgradeContainer(room, room.memory.bunker.anchor);
      if (_.get(room, 'memory.bunker.upgradeContainer')) {
        placeSourceContainers(room, room.memory.bunker.anchor);
      }
    }
  }
  if (Game.time % 19) {
    room.find(FIND_MY_SPAWNS).forEach(spawn => spawn.addTask('bootstrap'));
  }
  ensureBuilder(room);
  yield done();
}
