import {
  target as targetMatchers,
} from '../../utils/matchers';

export default function* sign(creep, {
  priority,
  sleep,
  done,
  subTask,
  context,
}) {
  let { target, msg } = context;
  if (!msg) {
    console.log('Must define a message for signing')
    yield sleep();
  }
  let controller;
  if (target) {
    controller = _.first(new RoomPosition(...target).lookFor(LOOK_STRUCTURES).filter(s => s.structure instanceof StructureController))
  } else {
    controller = _.first(creep.room.find(FIND_STRUCTURES, {
      filter: targetMatchers.isController,
    }));
  }

  const sign = _.get(controller, 'sign');
  if (controller && !sign || (sign && sign.username !== _.get(creep, 'room.controller.owner.username') && sign.text !== msg)) {
    yield priority(context.priority);
    const range = creep.pos.getRangeTo(controller);
    if (range > 1) {
      creep.routeTo(controller, { range: 1 });
    } else {
      creep.signController(controller, msg);
    }
  } else {
    yield sleep();
  }


}
