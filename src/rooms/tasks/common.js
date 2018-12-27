import {
  not,
  hasTask,
} from '../../utils/matchers';

export function ensureBuilder(room) {
  ensureSpawnTask(room, 'builder');
}

export function ensureQueen(room) {
  ensureSpawnTask(room, 'queen');
}

export function ensureDropMiner(room) {
  ensureSpawnTask(room, 'dropMiner');
}

export function ensureSpawnTask(room, task) {
  const spawns = room.find(FIND_MY_SPAWNS);
  const spawnsWithoutBuilder = spawns.filter(not(hasTask(task)));
  if (spawnsWithoutBuilder.length) {
    spawnsWithoutBuilder.forEach(spawn => spawn.addTask(task));
  }
}
