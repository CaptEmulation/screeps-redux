import construct from './construct';
import harvest from './harvest';

export default function* builder(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  const myConstructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  if (_.sum(creep.carry) === creep.carryCapacity && myConstructionSites.length) {
    yield subTask(construct);
  } else if (context.early){
    return yield subTask(harvest);
  } else {
    throw new Exception('Please tell me how to get stuff for midgame');
  }
}
