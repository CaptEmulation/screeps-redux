import {
  hasTask,
} from '../../utils/matchers';

function pathToRoom(scout, roomName) {
  const roomExit = scout.room.findExitTo(roomName);
  const path = scout.pos.findClosestByRange(roomExit);
  return path;
}

function roomExits(roomName) {
  return Object.values(Game.map.describeExits(roomName));
}

export default function* scout(scout, {
  priority,
  done,
  context,
}) {
  yield priority(context.priority);
  const roomName = scout.room.name;
  if (context.lastRoomIn !== scout.room.name) {
    context.visited = context.visited || [];
    if (!context.visited.includes(roomName)) {
      context.visited.push(roomName);
    }
    const exitsSeen = context.exitsSeen = context.exitsSeen || {};
    exitsSeen[roomName] = _.union(exitsSeen[roomName] || [], roomExits(roomName));
    if (!hasTask('scan')(Game.rooms[roomName])) {
      Game.rooms[roomName].addTask('remote');
    }
    const availableRoomNames = roomExits(roomName)
      .filter(n => !context.visited.includes(n));
    const availablePaths = availableRoomNames
      .map(pathToRoom.bind(null, scout));
    const shortestPath = _.minBy(availablePaths, p => scout.pos.getRangeTo(p));

    if (shortestPath) {
      context.path = shortestPath;
    } else {
      // Search for an available path
      const knownExits = Object.keys(context.exitsSeen).reduce((exits, roomName) => {
        exits.push(...Object.values(context.exitsSeen[roomName]));
        return exits;
      }, []);
      const visitedRooms = context.visited;
      const unseenRooms = _.difference(knownExits, visitedRooms);
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
  if (context.path) {
    let nextPos = new RoomPosition(context.path.x, context.path.y, context.path.roomName);
    if (nextPos.getRangeTo(scout.pos) > 1) {
      // We teleported from our path, correct...
      scout.routeTo(nextPos);
    } else {
      const direction = scout.pos.getDirectionTo(nextPos);
      //circle(newPos, "green");
      const err = scout.move(direction);
      if (err) {
        console.log('Scout move error', err);
      }
    }
  } else {
    yield done();
  }
}
