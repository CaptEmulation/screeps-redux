import towerDefense from './towerDefense';
import {
  ensureBuilder,
  ensureQueen,
  ensureDropMiner,
  ensureUpgrader,
  enhanceSources,
} from './common';
import {
  placeConstructionSites,
  placeUpgradeContainer,
  placeSourceContainers,
} from '../planner';
import {
  hasTask,
} from '../../utils/matchers';

export default function* rcl3(room, {
  priority,
  subTask,
  context,
  done,
}) {
  yield priority();
  yield subTask(towerDefense);
  if (_.get(room, 'memory.bunker.anchor') && Game.time % 25 === 0) {
    enhanceSources(room);
    placeConstructionSites(room, room.memory.bunker.anchor, 3);
    if (_.get(room, 'memory.bunker.containers.length') ===  1) {
      ensureQueen(room);
      ensureDropMiner(room);
      ensureUpgrader(room);
      placeUpgradeContainer(room, room.memory.bunker.anchor);
      if (_.get(room, 'memory.bunker.upgradeContainer')) {
        placeSourceContainers(room, room.memory.bunker.anchor);
        const sources = _.get(room, 'memory.sources', []);
        const queenCreeps = room.find(FIND_MY_CREEPS, {
          filter: hasTask('queen'),
        });
        const minerCreeps = room.find(FIND_MY_CREEPS, {
          filter: hasTask('dropMiner'),
        });
        if (sources.length && sources.every(s => s.containerId) && queenCreeps.length >= 1 && minerCreeps.length >= 1) {
          // convert to container mining
          const spawns = room.find(FIND_MY_SPAWNS, {
            filter: hasTask('bootstrap')
          })
          spawns.forEach(spawn => _.remove(spawn.memory.tasks, task => task.action === 'bootstrap'));
          Object.values(Game.creeps).filter(hasTask('pioneer')).forEach(creep => creep.addTask({
            action: 'recycleSelf',
            priority: -1,
          }));
        }
      }
    }
  }
  ensureBuilder(room);
  yield done();
}
