import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  hasTask,
} from '../../utils/matchers';

export default function* queen(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const queenCreeps = allCreeps.filter(hasTask('queen'));
    const max = 1
    context.needs = context.needs || {};
    context.needs.queens = max - queenCreeps.length;
    if (context.needs.queens > 0) {
      yield priority();
      const body = [MOVE, MOVE, CARRY, CARRY, CARRY, CARRY];
      const additionals = Math.floor(spawn.room.energyAvailable / calcCreepCost(body));
      for (let i = 0; i < additionals - 1; i++) {
        body.push(MOVE, MOVE, CARRY, CARRY, CARRY, CARRY);
      }

      const err = spawn.spawnCreep(body, sillyname(), {
        memory: {
          tasks: [{
            action: 'queen',
          }, {
            action: 'renewSelf',
          }],
        },
      });
      if (!err) {
        context.needs.queens--;
      }
      return;
    }
  }
  yield sleep();
}
