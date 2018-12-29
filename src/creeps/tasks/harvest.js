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
  if (context.waiting > 10) {
    context.sleepUntil = Game.time + 10;
  }
  if (context.sleepUntil) {
    if (context.sleepUntil > Game.time) {
      return yield sleep();
    } else {
      yield priority();
      return yield done();
    }
  }
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
      creep.routeTo(target, { range: 1 });
      if (range < 3) {
        context.waiting = context.waiting || 0;
        context.waiting++;
      }
    } else {
      delete context.waiting;
      creep.memory.target = target.id;
      creep.harvest(target);
    }
  }
}
