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

function findNewRoom() {

}

export default function* scout(scout, {
  priority,
  done,
  context,
}) {
  yield priority(context.priority);
  const roomName = scout.room.name;
  if (context.lastRoomIn !== scout.room.name) {
    if (context.target && scout.room.name === context.target) {
      delete context.target;
    }
    context.visited = context.visited || [];
    if (!context.visited.includes(roomName)) {
      context.visited.push(roomName);
    }
    const exitsSeen = context.exitsSeen = context.exitsSeen || {};
    exitsSeen[roomName] = _.union(exitsSeen[roomName] || [], roomExits(roomName));
    if (!hasTask('scan')(Game.rooms[roomName])) {
      Game.rooms[roomName].addTask('remote');
    }
    let availableRoomNames = roomExits(roomName)
      .filter(n => !context.visited.includes(n));
    if (context.target && availableRoomNames.includes(context.target)) {
      availableRoomNames = [context.target];
    }
    const availablePaths = availableRoomNames
      .map(pathToRoom.bind(null, scout));
    const randomPath = _.sample(availablePaths);

    if (randomPath) {
      context.path = randomPath;
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
      const err = scout.move(direction);
      if (err) {
        _.remove(context.exitsSeen[scout.room.name], room => room === context.path.roomName);
        delete context.lastRoomIn;
      }
    }
  } else {
    yield done();
  }
}
