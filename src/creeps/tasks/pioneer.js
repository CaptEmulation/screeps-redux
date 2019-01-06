import upgradeController from './upgradeController';
import fix from './fix';
import harvest from './harvest';
import renewSelf from './renewSelf';
import construct from './construct';
import pickup from './pickup';
import supplySpawn from './supplySpawn';
import supplyTower from './supplyTower';
import {
  and,
  not,
  hasTask,
} from '../../utils/matchers';
import {
  calcCreepCost,
} from '../../utils/creeps';

export default function* pioneer(creep, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (context.room && context.room !== creep.room.name) {
    if (creep.carry[RESOURCE_ENERGY] < creep.carryCapacity) {
      yield subTask(pickup);
    } else {
      creep.routeTo(new RoomPosition(24, 24, context.room));
    }
  } else if (_.sum(creep.carry) === creep.carryCapacity) {
    if ((yield subTask(supplyTower)).noTarget) {
      if ((yield subTask(supplySpawn)).noTarget) {
        if ((yield subTask(fix)).noTarget) {
          // If there are no construct creeps in room, then also look for construct targets
          const nonPioneerConstructCreeps = creep.room.find(FIND_MY_CREEPS).filter(
            and(
              not(hasTask('pioneer')),
              hasTask('construct'),
            ),
          );
          const controllerDowngrade = _.get(creep, 'room.controller.my') && _.get(creep, 'room.controller.ticksToDowngrade') < 1000;
          if (controllerDowngrade || nonPioneerConstructCreeps.length || (yield subTask(construct)).noTarget) {
            yield subTask(upgradeController);
          }
        }
      }
    }
  } else {
    if (!context.room || (yield subTask(pickup)).noTarget) {
      return yield subTask(harvest);
    }
  }
}
