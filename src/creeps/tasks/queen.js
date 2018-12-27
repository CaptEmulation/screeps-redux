import supplySpawn from './supplySpawn';
import supplyTower from './supplyTower';
import pickup from './pickup';

export default function* queen(creep, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === creep.carryCapacity) {
    const results = yield subTask(supplySpawn);
    if (_.get(results, 'targets.length') === 0) {
      yield subTask(supplyTower);
    }
  } else {
    return yield subTask(pickup);
  }
}
