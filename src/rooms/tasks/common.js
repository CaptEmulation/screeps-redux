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

export function ensureUpgrader(room) {
  ensureSpawnTask(room, 'upgrader');
}

export function ensureDropMiner(room, context) {
  ensureSpawnTask(room, 'dropMiner', context);
}

export function ensureSpawnTask(room, task, context = {}) {
  const spawns = room.find(FIND_MY_SPAWNS);
  const spawnsWithoutBuilder = spawns.filter(not(hasTask(task)));
  if (spawnsWithoutBuilder.length) {
    spawnsWithoutBuilder.forEach(spawn => spawn.addTask({
      action: task,
      ...context,
    }));
  }
  for (let spawn of spawns) {
    spawn.memory.tasks
      .filter(hasTask(task))
      .forEach(task => Object.keys(context).forEach(key => task[key] = context[key]));
  }
}
