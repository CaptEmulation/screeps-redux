import {
  getSourceId,
} from './common';

export default function* harvest(creep, {
  priority,
  sleep,
  done,
  subTask,
  context,
}) {
  yield priority();
  if (_.sum(creep.carry) === creep.carryCapacity) {
    delete creep.memory.target;
    return yield done();
  }
  let target;
  if (!context.sourceId) {
    context.sourceId = getSourceId(creep);
  }
  if (context.sourceId) {
    target = Game.getObjectById(context.sourceId);
  }
  if (target) {
    const range = creep.pos.getRangeTo(target);
    if (range > 1) {
      if (target.pos.availableNeighbors().length === 0) {
        delete context.sourceId;
        delete creep.memory.target;
        return yield done();
      }
      creep.routeTo(target, { range: 1 });
    } else {
      creep.memory.target = target.id;
      creep.harvest(target);
    }
  }
}
