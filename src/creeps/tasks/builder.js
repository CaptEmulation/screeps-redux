import construct from './construct';
import harvest from './harvest';
import fillFromBunker from './fillFromBunker';
import fillFromContainer from './fillFromContainer';

export default function* builder(creep, {
  priority,
  sleep,
  done,
  subTask,
  context,
}) {

  const myConstructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  if (myConstructionSites.length) {
    yield priority();
  } else {
    yield sleep();
  }
  if (_.sum(creep.carry) === creep.carryCapacity && myConstructionSites.length) {
    yield subTask(construct);
  } else {
    if (_.get(creep, 'room.memory.bunker.containers')) {
      if ((yield subTask(fillFromBunker)).noTarget) {
        if ((yield subTask(fillFromContainer)).noTarget) {
          yield subTask(harvest);
        }
      }
    } else if ((yield subTask(fillFromContainer)).noTarget) {
      yield subTask(harvest);
    }
  }
}
