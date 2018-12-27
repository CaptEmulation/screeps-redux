import rcl1 from './rcl1';
import rcl2 from './rcl2';
import rcl3 from './rcl3';
import {
  getBunkerLocation,
} from '../planner';

export default function* bootstrap(room, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (!context.scanned || Game.time % 50 === 0) {
    context.scanned = true;
    yield subTask(scan);
  }
  if (!context.anchor) {
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length) {
      const spawn = spawns[0];
      context.anchor = { x: spawn.pos.x - 4, y: spawn.pos.y };
    } else {
      context.anchor = getBunkerLocation(room, true);
    }
  }
  if (room.controller && room.controller.my) {
    switch (room.controller.level) {
      case 1:
        yield subTask(rcl1);
        break;
      case 2:
        yield subTask(rcl2);
        break;
      case 3:
        yield subTask(rcl3);
        break;
    }
  }
}
