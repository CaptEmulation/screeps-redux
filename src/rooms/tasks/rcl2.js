import {
  ensureBuilder,
} from './common';
import {
  placeConstructionSites,
} from '../planner';

export default function* rcl2(room, {
  priority,
  subTask,
  context,
  done,
}) {
  yield priority();
  if (room.controller && (room.controller.my && room.controller.level !== 2) || !room.controller.my) {
    yield done();
  }
  if (context.anchor && Game.time % 25 === 0) {
    placeConstructionSites(room, context.anchor, 2)
  }
  ensureBuilder(room);
}
