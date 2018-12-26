import {
  walkBox,
} from './utils/scan';
import { target as targetMatchers } from './utils/matchers';
import {
  findRoute,
  findTravelPath,
  normalizePos,
} from './utils/path';

// Stolen and refactored from https://github.com/bonzaiferroni/Traveler/blob/master/Traveler.js

const REPORT_CPU_THRESHOLD = 5000;

const DEFAULT_STUCK_VALUE = 2;
const STATE_PREV_X = 0;
const STATE_PREV_Y = 1;
const STATE_STUCK = 2;
const STATE_CPU = 3;
const STATE_DEST_X = 4;
const STATE_DEST_Y = 5;
const STATE_DEST_ROOMNAME = 6;

let lastTick = Game.time;
let movingCreeps = {};

function deserializeState(travelData, destination) {
  const state = {};
  if (travelData.state) {
    state.lastCoord = { x: travelData.state[STATE_PREV_X], y: travelData.state[STATE_PREV_Y] };
    state.cpu = travelData.state[STATE_CPU];
    state.stuckCount = travelData.state[STATE_STUCK];
    state.destination = new RoomPosition(
      travelData.state[STATE_DEST_X],
      travelData.state[STATE_DEST_Y],
      travelData.state[STATE_DEST_ROOMNAME],
    );
  } else {
    state.cpu = 0;
    state.destination = destination;
  }
  return state;
}

function serializeState(creep, destination, state, travelData) {
  travelData.state = [creep.pos.x, creep.pos.y, state.stuckCount, state.cpu, destination.x, destination.y,
    destination.roomName];
}

function serializePath(startPos, path, color = "orange") {
  let serializedPath = "";
  let lastPosition = startPos;
  circle(startPos, color);
  for (let position of path) {
    if (position.roomName === lastPosition.roomName) {
      new RoomVisual(position.roomName)
        .line(position, lastPosition, { color, lineStyle: "dashed" });
      serializedPath += lastPosition.getDirectionTo(position);
    }
    lastPosition = position;
  }
  return serializedPath;
}

function sameCoord(pos1, pos2) {
  return pos1.x === pos2.x && pos1.y === pos2.y;
}

function samePos(pos1, pos2) {
  return sameCoord(pos1, pos2) && pos1.roomName === pos2.roomName;
}

function isExit(pos) {
  return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
}

function isStuck(creep, state = {}) {
  let stuck = false;
  if (state.lastCoord !== undefined) {
    if (sameCoord(creep.pos, state.lastCoord)) {
      // didn't move
      stuck = true;
    } else if (isExit(creep.pos) && isExit(state.lastCoord)) {
      // moved against exit
      stuck = true;
    }
  }
  return stuck;
}

function circle(pos, color, opacity) {
  new RoomVisual(pos.roomName).circle(pos, {
    radius: .45, fill: "transparent", stroke: color, strokeWidth: .15, opacity: opacity
  });
}

function positionAtDirection(origin, direction) {
  const offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
  const offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
  const x = origin.x + offsetX[direction];
  const y = origin.y + offsetY[direction];
  if (x > 49 || x < 0 || y > 49 || y < 0) {
    return;
  }
  try {
    return new RoomPosition(x, y, origin.roomName);
  } catch (e) {
    console.log('Failed to set position', 'x =>', x, 'y =>', y, 'origin.x =>', origin.x, 'origin.y =>', origin.y, 'direction =>', direction, e);
  }
}

/**
* check how many rooms were included in a route returned by findRoute
* @param origin
* @param destination
* @returns {number}
*/
function routeDistance(origin, destination) {
  let linearDistance = Game.map.getRoomLinearDistance(origin, destination);
  if (linearDistance >= 32) {
    return linearDistance;
  }
  let allowedRooms = findRoute(origin, destination);
  if (allowedRooms) {
    return Object.keys(allowedRooms).length;
  }
}

export function moveTo({
  creep,
  target,
  range = 0,
  movingTarget,
  stuckValue = DEFAULT_STUCK_VALUE,
  opts: moveOptions = {},
  returnData,
  offRoad,
  route,
  useFindRoute,
  allowHostile,
  ignoreStructures,
  freshMatrix,
  obstacles,
  roomCallback,
  ignoreCreeps,
  maxOps,
  maxRooms,
  ignoreRoads,
  ensurePath,
}) {
  if (lastTick !== Game.time) {
    lastTick = Game.time;
    movingCreeps = {};
  }
  movingCreeps[creep.name] = { target };
  const destination = normalizePos(target);
  const pathOptions = {
    creep,
    target,
    range,
    movingTarget,
    stuckValue,
    opts: moveOptions,
    returnData,
    offRoad,
    route,
    useFindRoute,
    allowHostile,
    ignoreStructures,
    freshMatrix,
    obstacles,
    roomCallback,
    ignoreCreeps,
    maxOps,
    maxRooms,
    ignoreRoads,
    ensurePath,
  };
  if (creep.fatigue > 0) {
    circle(creep.pos, "aqua", .3);
    return null;
  }
  const rangeToDestination = creep.pos.getRangeTo(destination);
  if (range && rangeToDestination <= range) {
    return null;
  } else if (rangeToDestination <= 1) {
    if (rangeToDestination === 1 && !range) {
      const direction = creep.pos.getDirectionTo(destination);
      if (returnData) {
        returnData.nextPos = destination;
        returnData.path = direction.toString();
      }

      movingCreeps[creep.name].nextPosition = positionAtDirection(creep.pos, direction);
      const err = creep.move(direction);
      return err;
    }
    return null;
  }

  // initialize data object
  if (!creep.memory._trav) {
    creep.memory._trav = {};
  }

  const travelData = creep.memory._trav;
  const state = deserializeState(travelData, destination);

  if (isStuck(creep, state)) {
    state.stuckCount++;
    circle(creep.pos, "magenta", state.stuckCount * .2);
  } else {
    state.stuckCount = 0;
  }

  if (state.stuckCount >= stuckValue && Math.random() > .5) {
    pathOptions.ignoreCreeps = false;
    pathOptions.freshMatrix = true;
    delete travelData.path;
  }

  if (!samePos(state.destination, destination)) {
    if (movingTarget && state.destination.isNearTo(destination)) {
      travelData.path += state.destination.getDirectionTo(destination);
      state.destination = destination;
    } else {
      delete travelData.path;
    }
  }

  // pathfinding
  let newPath = false;
  if (!travelData.path) {
    newPath = true;
    if (creep.spawning) {
      return ERR_BUSY;
    }
    state.destination = destination;
    let cpu = Game.cpu.getUsed();
    let ret = findTravelPath(creep.pos, destination, pathOptions);
    let cpuUsed = Game.cpu.getUsed() - cpu;
    state.cpu = _.round(cpuUsed + state.cpu);
    if (state.cpu > REPORT_CPU_THRESHOLD) {
      // see note at end of file for more info on this
      console.log(`moveTo: heavy cpu use: ${creep.name}, cpu: ${state.cpu} origin: ${creep.pos}, dest: ${destination}`);
    }
    let color = "orange";
    if (ret.incomplete) {
      // uncommenting this is a great way to diagnose creep behavior issues
      // console.log(`TRAVELER: incomplete path for ${creep.name}`);
      color = "red";
    }
    if (returnData) {
      returnData.pathfinderReturn = ret;
    }
    travelData.path = serializePath(creep.pos, ret.path, color);
    state.stuckCount = 0;
  }
  serializeState(creep, destination, state, travelData);
  console.log('path', JSON.stringify(travelData.path), 'path length', travelData.path.length);
  if (!travelData.path || travelData.path.length <= 0) {
      return ERR_NO_PATH;
  }
  // consume path
  if (state.stuckCount === 0 && !newPath) {
    travelData.path = travelData.path.substring(1);
  }
  let nextDirection = parseInt(travelData.path[0], 10);
  if (nextDirection) {
    if (returnData) {
      let nextPos = positionAtDirection(creep.pos, nextDirection);
      if (nextPos) {
        returnData.nextPos = nextPos;
      }
      returnData.state = state;
      returnData.path = travelData.path;
    }
  }
  const nextPosition = positionAtDirection(creep.pos, nextDirection);
  console.log(`${creep.name} moving to ${nextPosition}`)
  movingCreeps[creep.name].nextPosition = nextPosition;
  const err = creep.move(nextDirection);
  return err;
}

Creep.prototype.nextPos = function () {
  const path = _.get(this, 'memory._trav.path');
  if (path) {
    let nextDirection = parseInt(travelData.path[0], 10);
    const nextPos = positionAtDirection(this.pos, nextDirection);
    return nextPos;
  }
  return this.pos;
}
Creep.prototype.routeTo = function routeCreep(target, opts) {
  return moveTo({
    creep: this,
    target,
    ...opts,
  });
};

function getTargetAndRange(creep) {
  let range = 1;
  let target;
  if (creep.memory.target) {
    target = Game.getObjectById(creep.memory.target)
    if (_.isNumber(creep.memory.range)) {
      range = creep.memory.range;
    }
  }
  return [target, range];
}

function moveCreepOutOfTheWay(creep, from, target, range, creepsToMove, nextPositions, creepMoves) {
  const availableSpots = [...walkBox(creep.pos)].filter(([x, y]) => {
    // if (from.find(fromCreep => fromCreep.pos.x === x && fromCreep.pos.y === y)) {
    //   return true;
    // }
    const newPos = new RoomPosition(x, y, creep.room.name);
    if (target && newPos.getRangeTo(target) > range) {
      return false;
    }
    for (let curr of newPos.look()) {
      if (
        (curr.type === 'terrain' && curr.terrain === 'wall')
        || (curr.type === 'structure' && !curr.structure instanceof StructureContainer)
      ) {
        return false;
      }
    }
    const creepsAtMySpot = newPos.lookFor(LOOK_CREEPS);
    if (creepsAtMySpot.length) {
      const creepAtMySpot = creepsAtMySpot[0];
      if (!creepAtMySpot.my) {
        return false;
      } else if (creepAtMySpot.my && !creepsToMove[creepAtMySpot.name]) {
        // Try to move this creep out of the way....
        const [target, range] = getTargetAndRange(creepAtMySpot);
        const from = [creep];
        creepsToMove[creepAtMySpot.name] = { from, target, range }
        moveCreepOutOfTheWay(creepAtMySpot, from, target, range, creepsToMove, nextPositions, creepMoves);
      }
    }
    if (
      !nextPositions.find(pos => pos.x === newPos.x && pos.y === newPos.y)
      && !creepMoves.find(([creep, pos]) => pos.x === newPos.x && pos.y === newPos.y)
    ) {
      return true;
    }
  });
  if (target) {
    let newPos;
    const keepRangeSpot = availableSpots.find(([x, y]) => {
      newPos = new RoomPosition(x, y, creep.room.name);
      const newRange = newPos.getRangeTo(target);
      if (
         newRange === range
        || (newRange <= range && newRange > creep.pos.getRangeTo(target))
      ) {
        return true;
      }
    });
    if (newPos && keepRangeSpot) {
      creepMoves.push([creep, newPos]);
    }
  } else if (availableSpots.length) {
    creepMoves.push([creep, availableSpots[0]]);
  }
}

Creep.getOutOfTheWay = function getAllCreepsOutOfTheWay() {
  if (lastTick !== Game.time) {
    lastTick = Game.time;
    movingCreeps = {};
  }
  const creepsToMove = {};
  const creepMoves = [];
  const nextPositions = [];
  for (let [creepName, { target, nextPosition }] of Object.entries(movingCreeps)) {
    if (nextPosition) {
      nextPositions.push(nextPosition);
      const creep = Game.creeps[creepName];
      const nextPosCreeps = nextPosition.lookFor(LOOK_CREEPS);
      if (nextPosCreeps) {
        const creepsAtNextPos = nextPosCreeps.filter(creep => creep.my);
        if (creepsAtNextPos.length) {
          const creepAtNextPos = creepsAtNextPos[0];
          if (creepAtNextPos !== creep) {
            if (creepsToMove[creepAtNextPos.name]) {
              // creep is already trying to move.... ignore
              continue;
            }
            if (!creepsToMove[creepAtNextPos.name]) {
              const [target, range] = getTargetAndRange(creepAtNextPos);
              creepsToMove[creepAtNextPos.name] = { from: [], target, range };
            }
            creepsToMove[creepAtNextPos.name].from.push(creep);
          }
        }
      }
    }
  }
  for (let [creepName, { from, target, range }] of Object.entries(creepsToMove)) {
    const creep = Game.creeps[creepName];
    moveCreepOutOfTheWay(creep, from, target, range, creepsToMove, nextPositions, creepMoves);
  }
  if (creepMoves.length)
  for (let [creep, newPos] of creepMoves) {
    const direction = creep.pos.getDirectionTo(newPos);

    const err = creep.move(direction);
  }
}

Creep.prototype.getOutOfTheWay = function getOutOfTheWay(target, range) {
  const onStructures = this.pos.lookFor(LOOK_STRUCTURES);
  const road = onStructures.find(s => s.structureType === STRUCTURE_ROAD);
  let movedFromRoad = false;
  const shuffled = _.shuffle([...walkBox(this.pos)]);
  if (road) {
    for (let coords of shuffled) {
      const pos = new RoomPosition(...coords, this.room.name);
      if (pos.getRangeTo(target) <= range
        && !pos.lookFor(LOOK_CREEPS).length
        && !pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_ROAD)) {
        this.move(this.pos.getDirectionTo(pos));
        movedFromRoad = true;
        break;
      }
    }
  }
  if (!movedFromRoad) {
    let creepNearby = false;
    for (let coords of shuffled) {
      const pos = new RoomPosition(...coords, this.room.name);
      const creeps = pos.lookFor(LOOK_CREEPS);
      if (creeps.length) {
        creepNearby = creeps[0];
        break;
      }
    }
    if (creepNearby) {
      let foundOpenSpot = false;
      for (let coords of shuffled) {
        const pos = new RoomPosition(...coords, this.room.name);
        if (pos.getRangeTo(target) <= range) {
          foundOpenSpot = true;
          this.move(this.pos.getDirectionTo(pos));
          break;
        }
      }
      if (!foundOpenSpot) {
        this.move(this.pos.getDirectionTo(creepNearby));
      }
    }
  }
}

Creep.prototype.addTask = function addCreepTask(...args) { return global.addCreepTask(this.name, ...args) };
