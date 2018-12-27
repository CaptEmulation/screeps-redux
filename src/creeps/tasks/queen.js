import supplySpawn from './supplySpawn';
import supplyTower from './supplyTower';
import supplyBunker from './supplyBunker';
import pickup from './pickup';

export default function* queen(creep, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) > 0) {
    if ((yield subTask(supplyTower)).noTarget) {
      if ((yield subTask(supplySpawn)).noTarget) {
        yield subTask(supplyBunker);
      }
    }
  } else {
    return yield subTask(pickup);
  }
}
