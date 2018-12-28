import upgradeController from './upgradeController';
import harvest from './harvest';
import fillFromContainer from './fillFromContainer';
import fillFromBunker from './fillFromBunker';

export default function* upgrader(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  const myConstructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  if (_.sum(creep.carry) === creep.carryCapacity && creep.room.controller && creep.room.controller.my) {
    yield subTask(upgradeController);
  } else {
    if ((yield subTask(fillFromContainer, {
      container: Game.getObjectById(_.get(creep, 'room.memory.bunker.upgradeContainer')),
    })).noTarget) {
      if ((yield subTask(fillFromBunker)).noTarget) {
        yield subTask(harvest);
      }
    }
  }
}
