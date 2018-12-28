import upgradeController from './upgradeController';
import harvest from './harvest';
import fix from './fix';
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
    if ((yield subTask(fix)).noTarget) {
      yield subTask(upgradeController);
    }
  } else {
    const container =  Game.getObjectById(_.get(creep, 'room.memory.bunker.upgradeContainer'));
    if (!container || (yield subTask(fillFromContainer, {
      container: container.id,
    })).noTarget) {
      if ((yield subTask(fillFromBunker)).noTarget) {
        yield subTask(harvest);
      }
    }
  }
}
