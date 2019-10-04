import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  and,
  hasTask,
  target as targetMatchers,
} from '../../utils/matchers';

const builds = [
  [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
  [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
];

export default function* queen(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const queenCreeps = allCreeps.filter(and(hasTask('queen'), c => c.room === spawn.room));
    const max = Math.floor((spawn.room.find(FIND_STRUCTURES, {
      filter: targetMatchers.isContainer,
    }).length + 1) / 2)
    if (max - queenCreeps.length > 0) {
      yield priority(queenCreeps.length === 0 ? -5 : 0);
      let isReduced = false;
      let level = spawn.room.controller.level - 1;
      if (level > 0 && context.waiting > 5) {
        level -= Math.floor(context.waiting / 5);
      }
      const body = builds[Math.max(0, level)];
      let tasks = [{
        action: 'queen',
      }]
      if (isReduced) {
        tasks.push({
          action: 'recycleSelf',
        });
      } else {
        tasks.push({
          action: 'renewSelf',
        });
      }
      const err = spawn.spawnCreep(body, `Queen ${sillyname()}`, {
        memory: {
          tasks,
        },
      });

      if (!err) {
        delete context.waiting;
      } else if (err === ERR_NOT_ENOUGH_ENERGY) {
        console.log('waiting?',Math.floor(context.waiting / 20))
        context.waiting = context.waiting || 0;
        context.waiting++;
      }
      return;
    }
  }
  yield sleep();
}
