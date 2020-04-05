import construct from './construct';
import harvest from './harvest';
import ramparts from './ramparts';
import walls from './walls';
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
  yield priority();
  if (_.sum(creep.carry) > 0) {

    if ((yield subTask(ramparts)).noTarget && _.sum(creep.carry) === creep.carryCapacity && myConstructionSites.length) {

      yield subTask(construct);
    }  else {

      yield subTask(walls);
    }
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
