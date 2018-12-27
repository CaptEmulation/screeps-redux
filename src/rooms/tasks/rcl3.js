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
  if (room.memory.anchor && Game.time % 25 === 0) {
    placeConstructionSites(room, room.memory.bunker.anchor, 3);
    placeUpgradeContainer(room, room.memory.bunker.anchor);
    placeSourceContainers(room, room.memory.bunker.anchor);
  }
}
