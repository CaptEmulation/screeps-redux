import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  hasTask,
} from '../../utils/matchers';

export default function* upgrader(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const upgraderCreeps = allCreeps.filter(hasTask('upgrader'));
    const max = 4;
    context.needs = context.needs || {};
    context.needs.upgrader = max - upgraderCreeps.length;
    if (context.needs.upgrader > 0) {
      yield priority();
      const body = [MOVE, MOVE, CARRY, CARRY, WORK, WORK, WORK, WORK];
      const err = spawn.spawnCreep(body, `${sillyname()} C.P.U. Esquire`, {
        memory: {
          tasks: [{
            action: 'upgrader',
          }, {
            action: 'renewSelf',
          }],
        },
      });
      if (!err) {
        context.needs.upgrader--;
      }
      return;
    }
  }
  yield sleep();
}
