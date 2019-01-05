import rcl1 from './rcl1';
import rcl2 from './rcl2';
import rcl3 from './rcl3';
import rcl4 from './rcl4';
import rcl5 from './rcl5';
import scan from './scan';

export default function* bootstrap(room, {
  priority,
  subTask,
  context,
}) {
  yield priority();
  if (!context.scanned || Game.time % 25 === 0) {
    context.scanned = true;
    yield subTask(scan);
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
      case 4:
        yield subTask(rcl4);
        break;
      case 5:
      default:
        yield subTask(rcl5);
        break;
    }
  }
}
