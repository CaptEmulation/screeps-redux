import {
  findWorkSites,
} from '../../utils/find';

export default function* claimer(creep, {
  priority,
  sleep,
  done,
  context,
}) {
  let { target, done: isDone } = context;
  if (!target || isDone) {
    yield sleep();
  }
  target = new RoomPosition(...target);

  yield priority(context.priority);
  const range = creep.pos.getRangeTo(target);
  if (range > 1) {
    creep.routeTo(target, { range: 1 });
  } else {
    const controller = _.first(target.lookFor(LOOK_STRUCTURES).filter(s => s instanceof StructureController));
    if (controller.my) {
      context.done = true;
    }
    const err = creep.claimController(controller);
    if (!err) {
      context.done = true;
    }
  }
}
