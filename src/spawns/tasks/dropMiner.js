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
    const sources = spawn.room.memory.sources;

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
        console.log(JSON.stringify({ creep: creep.name, fromSource }));
        const remainingSources = spawn.room.memory.sources.filter(s => s.pendingSpots > 0 && s.id !== fromSource);
        console.log(JSON.stringify(remainingSources));
        const closest = creep.pos.findClosestByRange(remainingSources.map(s => Game.getObjectById(s.id)));
        if (closest) {
          console.log('move to', closest);
          const closestRemaningSource = remainingSources.find(s => s.id === closest.id);
          const dropMinerTask = creep.memory.tasks.find(t => t.action === 'dropMiner');
          dropMinerTask.sourceId = closest.id;
          closestRemaningSource.pendingSpots--;
          closestRemaningSource.workParts += creep.body.find(b => b.type === WORK).length;
        }
      }
    }

    if (_.get(spawn, 'room.memory.sources', []).find(s => s.workParts < 5)) {
      yield priority();
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
          }],
        },
      });
      if (!err) {
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
