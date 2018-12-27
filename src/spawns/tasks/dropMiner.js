import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  hasTask,
} from '../../utils/matchers';

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
    const max = 1;
    context.needs = context.needs || {};
    context.needs.dropMiner = max - dropMinerCreeps.length;
    if (context.needs.dropMiner > 0) {
      yield priority();
      const body = [MOVE, CARRY, WORK, WORK];
      const additionals = Math.floor(spawn.room.energyAvailable / calcCreepCost(body));
      for (let i = 0; i < additionals - 1; i++) {
        body.push(MOVE, CARRY, WORK, WORK);
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
        context.needs.dropMiner--;
      }
      return;
    }
  }
  yield sleep();
}
