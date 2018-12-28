import {
  exits as roomExits
} from '../../utils/room';
function pathToRoom(roomName) {
  const roomExit = scout.room.findExitTo(roomName);
  const path = scout.pos.findClosestByRange(roomExit);
  return path;
}

export default function* scout(scout, {
  priority,
  done,
  context,
}) {
  yield priority(context.priority);
  const roomName = scout.room.name;
  if (context.lastRoomIn !== scout.room.name) {
    context.visisted = context.visisted || [];
    if (!context.visisted.includes(roomName)) {
      context.visisted.push(roomName);
    }
    const exitsSeen = context.exitsSeen = context.exitsSeen || {};
    exitsSeen[roomName] = _.union(exitsSeen[roomName] || [], roomExits(roomName));
    const availableRoomNames = roomExits(roomName)
      .filter(n => !scout.memory.visited.includes(n));
    console.log('Scout available rooms', JSON.stringify(availableRoomNames));
    const availablePaths = availableRoomNames
      .map(pathToRoom);
    console.log('Scout paths', JSON.stringify(availablePaths))
    const shortestPath = _.minBy(availablePaths, p => p.length);
    console.log('Scout shortest path', JSON.stringify(shortestPath))
    if (shortestPath) {
      context.path = shortestPath;
    } else {
      // Search for an available path
      const knownExits = Object.keys(context.exitsSeen);
      const visistedRooms = context.visisted;
      const unseenRooms = _.difference(knownExits, visistedRooms);
      if (unseenRooms.length) {
        const goToRoom = _.last(unseenRooms);
        const pathResults = PathFinder.search(scout.pos, new RoomPosition(24, 24, goToRoom), {
          range: 24,
        });
        if (pathResults.incomplete) {
          context.incomplete = true;
        } else {
          delete context.incomplete;
        }
        context.path = pathResults.path;
      }
    }
    context.lastRoomIn = scout.room.name;
  }
  if(context.path.length && !RoomPosition.sameCoord(context.lastPos, scout.pos)) {
    if (context.lastPos) {
      context.path.shift();
    }
    context.lastPos = { x: scout.pos.x, y: scout.pos.y };
  }

  if (context.path.length) {
    let nextPos = context.path[0];
    nextPos = new RoomPosition(nextPos.x, nextPos.y, roomName: scout.room.name);
    if (nextPos.getRangeTo(scout.pos) > 1) {
      // We teleported from our path, correct...
      scout.routeTo(nextPos);
    } else {
      const direction = scout.pos.getDirectionTo(newPos);
      circle(newPos, "green");
      const err = creep.move(direction);
      if (err) {
        console.log('Scout move error', err);
      }
    }
  } else {
    delete context.lastPos;
    yield done();
  }
}
