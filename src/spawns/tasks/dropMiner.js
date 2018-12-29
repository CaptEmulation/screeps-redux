import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  hasTask,
} from '../../utils/matchers';
import {
  freeSpotsAtSource,
} from '../../creeps/tasks/common';

const small = [MOVE, CARRY, WORK, WORK];
const large = [ WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];

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
    const dropMinerCreeps = allCreeps.filter(hasTask('dropMiner'));
    const sources = _.get(spawn, 'room.memory.sources', []);

    if (!context.nextSourceId  && sources && sources.length) {
      const canMoves = [];
      for (let { id, workParts } of spawn.room.memory.sources) {
        if (workParts > 5) {
          // Find 5 work parts
          let sourceWorkParts = 0;
          for (let creep of dropMinerCreeps) {
            if (sourceWorkParts > 5) {
              canMoves.push({
                creep,
                from: id,
              });
            } else {
              const wp = creep.body.filter(b => b.type === WORK).length;
              sourceWorkParts += wp;
            }
          }
        } else {
          context.nextSourceId = id;
        }
      }

      for (let { creep, from: fromSource } of canMoves) {
        const remainingSources = spawn.room.memory.sources.filter(s => s.pendingSpots > 0 && s.id !== fromSource);
        const closest = creep.pos.findClosestByRange(remainingSources.map(s => Game.getObjectById(s.id)));
        if (closest) {
          const closestRemaningSource = remainingSources.find(s => s.id === closest.id);
          const dropMinerTask = creep.memory.tasks.find(t => t.action === 'dropMiner');
          dropMinerTask.sourceId = closest.id;
          closestRemaningSource.pendingSpots--;
          closestRemaningSource.workParts += creep.body.filter(b => b.type === WORK).length;
        }
      }
    }

    const sourceDef = sources.find(s => s.workParts < 5);
    const totalWorkAvailable = dropMinerCreeps.reduce((sum, creep) => {
      return sum + creep.body.filter(b => b.type === WORK).length
    }, 0);
    const totalWorkNeeded = sources.length * 5;
    if (sourceDef && totalWorkAvailable < totalWorkNeeded) {
      yield priority(dropMinerCreeps.length == 0 ? -1 : 0);
      let body;
      if (calcCreepCost(large) <= spawn.room.energyAvailableCapacity && (!context.wait || context.wait < 25)) {
        body = large;
      } else {
        body = small;
      }
      const err = spawn.spawnCreep(large, `${sillyname()} the Miner`, {
        memory: {
          tasks: [{
            action: 'dropMiner',
            sourceId: context.nextSourceId,
          }, {
            action: 'renewSelf',
          }, {
            action: 'recycleSelf'
          }],
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
