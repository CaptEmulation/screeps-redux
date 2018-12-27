import upgradeController from './upgradeController';
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
      _.remove(creep.memory.tasks, hasTask('renewSelf'));
    }
  }
  if (_.sum(creep.carry) === creep.carryCapacity) {
    const results = yield subTask(supplySpawn);
    if (_.get(results, 'targets.length') === 0) {
      yield subTask(upgradeController);
    }
  } else {
    return yield subTask(harvest);
  }
}
