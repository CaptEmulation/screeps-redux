import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  hasTask,
} from '../../utils/matchers';

export default function* bootstrap(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning && spawn.room.memory.sources.length) {
    const allCreeps = Object.values(Game.creeps);
    const pioneerCreeps = allCreeps.filter(hasTask('pioneer'));
    const max = spawn.room.memory.sources.length * 3;
    context.needs = context.needs || {};
    context.needs.pioneers = max - pioneerCreeps.length;
    if (context.needs.pioneers > 0) {
      yield priority(-1);
      const body = [MOVE, MOVE, CARRY, WORK];
      const additionals = Math.floor(spawn.room.energyAvailable / calcCreepCost(body));
      for (let i = 0; i < additionals - 1; i++) {
        body.push(MOVE, MOVE, CARRY, WORK);
      }
      const err = spawn.spawnCreep(body, sillyname(), {
        memory: {
          tasks: [{
            action: 'pioneer',
          }, {
            action: 'renewSelf',
          }],
        },
      });
      if (!err) {
        context.needs.pioneers--;
      }
      return;
    }
  }
  yield sleep();
}
