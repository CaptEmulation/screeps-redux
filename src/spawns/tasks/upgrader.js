import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  and,
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
    const upgraderCreeps = allCreeps.filter(and(hasTask('upgrader'), c => c.room === spawn.room));
    const max = 4;
    if (max - upgraderCreeps.length > 0) {
      yield priority();
      const body = [MOVE, MOVE, MOVE, CARRY, CARRY, WORK, WORK, WORK, WORK];
      while (calcCreepCost(body) > spawn.room.energyCapacityAvailable) {
        body.shift();
        body.pop();
      }
      if (!body.find(b => b.type === MOVE)) {
        body.push(MOVE);
        if (calcCreepCost(body) > spawn.room.energyCapacityAvailable) {
          body.pop();
        }
      }
      const err = spawn.spawnCreep(body, `${sillyname()} CPU Esquire`, {
        memory: {
          tasks: [{
            action: 'upgrader',
          }, {
            action: 'renewSelf',
          }],
        },
      });
      return;
    }
  }
  yield sleep();
}
