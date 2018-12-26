import sillyname from 'sillyname';
import {
  hasTask,
} from '../utils/matchers';

export function* bootstrap(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const pioneerCreeps = allCreeps.filter(hasTask('pioneer'));
    context.needs = context.needs || {};
    context.needs.pioneers = context.needs.pioneers || ((spawn.room.memory.sources.length * 3) - pioneerCreeps.length);
    if (context.needs.pioneers > 0) {
      yield priority(-1);
      const err = spawn.spawnCreep([MOVE, MOVE, CARRY, WORK], sillyname(), {
        memory: {
          tasks: [{
            action: 'pioneer',
          }, {
            action: 'renewSelf',
          }],
        },
      });
      if (!err) {
        context.needs.pioneers--;
      }
      return;
    }
  }
  yield sleep();
}

export function* builder(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const builderCreeps = allCreeps.filter(hasTask('builder'));
    const myConstructionSites = spawn.room.find(FIND_MY_CONSTRUCTION_SITES);
    context.needs = context.needs || {};
    context.needs.builders = context.needs.builders || myConstructionSites.length ? Math.min(myConstructionSites.length, 3) : 0;
    if (context.needs.builders > 0) {
      yield priority();
      const err = spawn.spawnCreep([MOVE, MOVE, CARRY, WORK], sillyname(), {
        memory: {
          tasks: [{
            action: 'builder',
            early: true,
          }],
        },
      });
      if (!err) {
        context.needs.builders--;
      }
      return;
    }
  }
  yield sleep();
}
