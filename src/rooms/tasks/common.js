import {
  not,
  or,
  hasTask,
} from '../../utils/matchers';
import {
  freeSpotsAtSource,
} from '../../creeps/tasks/common';

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
    spawnsWithoutBuilder.forEach(spawn => spawn.addTask(task, context));
  }
  for (let spawn of spawns) {
    spawn.memory.tasks
      .filter(hasTask(task))
      .forEach(task => Object.keys(context).forEach(key => task[key] = context[key]));
  }
}

export function enhanceSources(room) {
  const allCreeps = Object.values(Game.creeps);
  const minerCreeps = allCreeps.filter(or(hasTask('dropMiner'), hasTask('harvest')));
  const sources = room.memory.sources;

  if (sources && sources.length) {
    room.memory.sources = sources
      .map(sourceDef => {
        const source = Game.getObjectById(sourceDef.id);
        const sourceCreeps = minerCreeps
          .filter(creep => creep.room === room && creep.memory.target === source.id);
        const availableSpots = freeSpotsAtSource(source).length - sourceCreeps.length;
        const workParts = sourceCreeps
          .reduce((sum, creep) => {
            return sum + creep.body.filter(b => b.type === WORK).length;
          }, 0);

        return {
          id: sourceDef.id,
          availableSpots,
          pendingSpots: availableSpots,
          containerId: sourceDef.containerId,
          workParts,
        };
      });
  }
}
