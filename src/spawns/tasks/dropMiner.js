import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  and,
  hasTask,
} from '../../utils/matchers';
import {
  freeSpotsAtSource,
} from '../../creeps/tasks/common';

const small = [MOVE, CARRY, WORK, WORK];
const large = [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];

const roomCache = {};

export default function* dropMiner(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const dropMinerCreeps = allCreeps.filter(and(hasTask('dropMiner'), c => c.room === spawn.room));
    const sources = _.get(spawn, 'room.memory.sources', []);
    const sourceDef = sources.find(s => s.workParts < 5);
    const totalWorkAvailable = dropMinerCreeps.reduce((sum, creep) => {
      return sum + creep.body.filter(b => b.type === WORK).length
    }, 0);
    const totalWorkNeeded = sources.length * 5;
    if (sourceDef && totalWorkAvailable < totalWorkNeeded) {
      yield priority(dropMinerCreeps.length == 0 ? -1 : 0);
      let body;
      let tasks = [];
      if (calcCreepCost(large) <= spawn.room.energyAvailable) {
        body = large;
        tasks.push({
          action: 'dropMiner',
          sourceId: context.nextSourceId,
        }, {
          action: 'renewSelf',
        }, {
          action: 'recycleSelf'
        })
      } else {
        body = small;
        tasks.push({
          action: 'dropMiner',
          sourceId: context.nextSourceId,
        })
      }
      const err = spawn.spawnCreep(body, `${sillyname()} the Miner`, {
        memory: {
          tasks,
        },
      });
      if (!err) {
        sourceDef.pendingSpots--;
        if (body === large) {
          sourceDef.workParts += 5;
        } else {
          sourceDef.workParts += 2;
        }
        delete context.wait;
        delete context.nextSourceId;
      } else if (err === ERR_NOT_ENOUGH_ENERGY) {
        context.wait = context.wait || 0;
        context.wait++;
      }
      return;
    }
  }
  yield sleep();
}
