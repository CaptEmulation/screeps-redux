import {
  findWorkSites,
} from '../../utils/find';

export default function* construct(creep, {
  priority,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === 0) {
    delete creep.memory.target;
    delete creep.memory.range;
    yield done();
  }
  const myConstructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);
  if (!myConstructionSites.length) {
    yield done({
      noTarget: true,
    });
  }
  const target = findWorkSites(creep.room);
  const range = creep.pos.getRangeTo(target);
  if (range > 3) {
    creep.routeTo(target, { range: 3 });
  } else {
    creep.memory.target = target.id;
    creep.memory.range = 3;
    creep.build(target);
  }
}
