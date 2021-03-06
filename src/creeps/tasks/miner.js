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
  yield priority(1);
  const myConstructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  if (_.sum(creep.carry) === creep.carryCapacity) {
    if ((yield subTask(fix, {
      percent: 0.95
    })).noTarget) {
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
