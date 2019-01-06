import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  and,
  hasTask,
  target as targetMatchers,
} from '../../utils/matchers';


export default function* claimer(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const { targets } = context;
    context.lastRoom = context.lastRoom || -1;
    const claimerCreeps = allCreeps.filter(hasTask('claimer'));
    const targetsNeedingClaims = _.difference(targets, claimerCreeps.map(c => {
      const claimTask = c.memory.tasks.find(t => t.action === 'claimer');
      if (claimTask && claimTask.target) {
        return claimTask.target[2];
      }
    }).filter(a => !!a), targets.filter(a => !Game.rooms[a] || (Game.rooms[a] && Game.rooms[a].controller && Game.rooms[a].controller.my)));
    if (targetsNeedingClaims.length > 0) {
      context.lastRoom++;
      if (context.lastRoom >= targets.length) {
        context.lastRoom = 1;
      }
      const roomName = context.targets[context.lastRoom];
      const roomControllerPos = _.get(Memory.rooms[roomName], 'controller.pos');
      if (roomControllerPos) {
        yield priority();
        const body = [CLAIM, MOVE];
        const err = spawn.spawnCreep(body, `Claimer ${sillyname()}`, {
          memory: {
            tasks: [{
              action: 'claimer',
              target: [...roomControllerPos, roomName],
            }, {
              action: 'sign',
              msg: 'screeps-redux',
            },{
              action: 'recycleSelf',
            }],
          },
        });
        return;
      }
    }
  }
  yield sleep();
}
