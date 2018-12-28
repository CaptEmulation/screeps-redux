import supplySpawn from './supplySpawn';
import supplyTower from './supplyTower';
import supplyBunker from './supplyBunker';
import supplyUpgrade from './supplyUpgrade';
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
        if ((yield subTask(supplyBunker)).noTarget) {
          yield subTask(supplyUpgrade);
        }
      }
    }
  } else {
    return yield subTask(pickup);
  }
}
