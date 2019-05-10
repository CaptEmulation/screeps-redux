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
  if (_.sum(creep.carry) === creep.carryCapacity && creep.room.controller && creep.room.controller.my) {
    if ((yield subTask(fix, {
      noFix: [ STRUCTURE_WALL, STRUCTURE_RAMPART ],
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
