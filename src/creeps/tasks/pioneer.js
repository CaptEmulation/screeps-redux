import upgradeController from './upgradeController';
import fix from './fix';
import harvest from './harvest';
import renewSelf from './renewSelf';
import supplySpawn from './supplySpawn';
import {
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
  if (Game.time % 50) {
    // Check if we still need to live....
    if (calcCreepCost([MOVE, MOVE, CARRY, WORK]) + creep.cost <= creep.room.energyAvailable) {
      _.remove(creep.memory.tasks, task => task.action === 'renewSelf');
    }
  }
  if (_.sum(creep.carry) === creep.carryCapacity) {
    let results = yield subTask(supplySpawn);
    if (results.noTarget) {
      results = yield subTask(fix);
      if (results.noTarget) {
        yield subTask(upgradeController);
      }
    }
  } else {
    return yield subTask(harvest);
  }
}
