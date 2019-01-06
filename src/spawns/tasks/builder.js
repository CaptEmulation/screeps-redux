import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  and,
  hasTask,
} from '../../utils/matchers';

export default function* builder(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const allCreeps = Object.values(Game.creeps);
    const builderCreeps = allCreeps.filter(and(hasTask('builder'), c => c.room === spawn.room));
    const myConstructionSites = spawn.room.find(FIND_MY_CONSTRUCTION_SITES);
    const max = myConstructionSites.length ? Math.min(myConstructionSites.length, 3) : 0;
    context.needs = context.needs || {};
    context.needs.builders = max - builderCreeps.length;
    if (context.needs.builders > 0) {
      yield priority();
      const body = [MOVE, MOVE, CARRY, WORK];
      const additionals = Math.floor(spawn.room.energyAvailable / calcCreepCost(body));
      for (let i = 0; i < additionals - 1; i++) {
        body.push(MOVE, MOVE, CARRY, WORK);
      }

      const err = spawn.spawnCreep(body, `${sillyname()} the Builder`, {
        memory: {
          tasks: [{
            action: 'builder',
            early: true,
          }, {
            action: 'recycleSelf',
          }],
        },
      });
      if (!err) {
        context.needs.builders--;
      }
      return;
    }
  }
  yield sleep();
}
