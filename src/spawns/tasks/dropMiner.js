import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  hasTask,
} from '../../utils/matchers';

const small = [MOVE, CARRY, WORK, WORK];
const large = [ WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];

export default function* dropMiner(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const dropMinerCreeps = allCreeps.filter(hasTask('dropMiner'));
    const max = context.count || 1;
    if (max - dropMinerCreeps.length > 0) {
      yield priority();
      let body;
      if (calcCreepCost(large) <= spawn.room.energyAvailableCapacity && (!context.wait || context.wait < 25)) {
        body = large;
      } else {
        body = small;
      }
      const err = spawn.spawnCreep(body, sillyname(), {
        memory: {
          tasks: [{
            action: 'dropMiner',
          }, {
            action: 'renewSelf',
          }],
        },
      });
      if (!err) {
        delete context.wait;
      } else if (err === ERR_NOT_ENOUGH_ENERGY) {
        context.wait = context.wait || 0;
        context.wait++;
      }
      return;
    }
  }
  yield sleep();
}
