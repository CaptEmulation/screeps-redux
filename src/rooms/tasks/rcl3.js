import {
  placeConstructionSites,
  placeUpgradeContainer,
  placeSourceContainers,
} from '../planner';

export default function* rcl3(room, {
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
    placeConstructionSites(room, context.anchor, 3);
    placeUpgradeContainer(room, context.anchor);
    placeSourceContainers(room, context.anchor);
  }
}
