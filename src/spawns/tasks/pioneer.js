import sillyname from 'sillyname';
import {
  calcCreepCost,
} from '../../utils/creeps';
import {
  hasTask,
} from '../../utils/matchers';

export default function* pioneer(spawn, {
  priority,
  sleep,
  subTask,
  context,
  done,
}) {
  if (!spawn.spawning) {
    const { targets } = context;
    // Remove targets as they become self sufficient
    context.targets = context.targets.filter(roomName => {
      if (!Game.rooms[roomName]) {
        return true;
      }
      if (_.get(Game.rooms[roomName], 'controller.level', 0) < 3 || Game.rooms[roomName].find(FIND_MY_CREEPS).length === 0) {
        return true;
      }
    });
    context.lastRoom = context.lastRoom || -1;
    const allCreeps = Object.values(Game.creeps);
    const myPioneerCreeps = allCreeps.filter(hasTask('pioneer', t => !!t.room));
    if (myPioneerCreeps.length < (6 * context.targets.length)) {
      yield priority();
      let body = [MOVE, MOVE, MOVE, CARRY, WORK, WORK];
      const additionals = Math.floor(spawn.room.energyAvailable / calcCreepCost(body));
      for (let i = 0; i < additionals - 1; i++) {
        body.push(MOVE, MOVE, MOVE, CARRY, WORK, WORK);
      }
      context.lastRoom++;
      if (context.lastRoom >= targets.length) {
        context.lastRoom = 1;
      }
      const name = `${sillyname()} Pioneer`;
      const err = spawn.spawnCreep(body, name, {
        memory: {
          tasks: [{
            action: 'pioneer',
            room: context.targets[context.lastRoom],
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
