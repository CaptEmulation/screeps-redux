import sillyname from 'sillyname';
import {
  hasTask,
} from '../utils/matchers';

const bootstrapTasks = [{
  action: 'pioneer',
}, {
  action: 'renewSelf',
}];

export function* bootstrap(spawn, {
  priority,
  subTask,
  context,
  done,
}) {
  yield priority();
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const pioneerCreeps = allCreeps.filter(hasTask('pioneer'));
    context.needs = context.needs || {};
    context.needs.pioneers = context.needs.pioneers || ((spawn.room.memory.sources.length * 3) - pioneerCreeps.length);
    if (context.needs.pioneers > 0) {
      const err = spawn.spawnCreep([MOVE, MOVE, CARRY, WORK], sillyname(), { memory: { tasks: bootstrapTasks } });
      if (!err) {
        context.needs.pioneers--;
      }
    }
  }
}
