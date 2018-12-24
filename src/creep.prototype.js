import {
  walkBox,
} from './utils/scan';
import { target as targetMatchers } from './utils/matchers';

// Stolen and refactored from https://github.com/bonzaiferroni/Traveler/blob/master/Traveler.js

const REPORT_CPU_THRESHOLD = 10000;

const DEFAULT_MAXOPS = 20000;
const DEFAULT_STUCK_VALUE = 2;
const STATE_PREV_X = 0;
const STATE_PREV_Y = 1;
const STATE_STUCK = 2;
const STATE_CPU = 3;
const STATE_DEST_X = 4;
const STATE_DEST_Y = 5;
const STATE_DEST_ROOMNAME = 6;

const structureMatrixCache = {};
const creepMatrixCache = {};
let structureMatrixTick;
let creepMatrixTick;

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
    console.log('Failed to set position', x, y, origin.roomName, e);
  }
}

function normalizePos(destination) {
  if (!(destination instanceof RoomPosition)) {
    return destination.pos;
  }
  return destination;
}

function checkAvoid(roomName) {
  return Memory.rooms && Memory.rooms[roomName] && Memory.rooms[roomName].avoid;
}

function findTravelPath(origin, destination, {
  movingTarget,
  ignoreCreeps = true,
  maxOps = DEFAULT_MAXOPS,
  maxRooms,
  ignoreRoads,
  range: inRange = 1,
  route,
  useFindRoute,
  allowHostile,
  ignoreStructures,
  freshMatrix,
  obstacles,
  roomCallback,
  offRoad,
  ensurePath,
} = {}) {
  let range = inRange;
  if (movingTarget) {
    range = 0;
  }
  origin = normalizePos(origin);
  destination = normalizePos(destination);
  let originRoomName = origin.roomName;
  let destRoomName = destination.roomName;
  // check to see whether findRoute should be used
  let roomDistance = Game.map.getRoomLinearDistance(origin.roomName, destination.roomName);
  let allowedRooms = route;
  if (!allowedRooms && (useFindRoute || (useFindRoute === undefined && roomDistance > 2))) {
    let route = findRoute(origin.roomName, destination.roomName, {
      movingTarget,
      ignoreCreeps,
      maxOps,
      maxRooms,
      ignoreRoads,
      range,
      route,
      useFindRoute,
      allowHostile,
      ignoreStructures,
      freshMatrix,
      obstacles,
      roomCallback,
      offRoad,
      ensurePath,
    });
    if (route) {
      allowedRooms = route;
    }
  }
  let roomsSearched = 0;
  let callback = (roomName) => {
    if (allowedRooms) {
      if (!allowedRooms[roomName]) {
        return false;
      }
    }
    else if (!allowHostile && checkAvoid(roomName)
      && roomName !== destRoomName && roomName !== originRoomName) {
      return false;
    }
    roomsSearched++;
    let matrix;
    let room = Game.rooms[roomName];
    if (room) {
      if (ignoreStructures) {
        matrix = new PathFinder.CostMatrix();
        if (!ignoreCreeps) {
          addCreepsToMatrix(room, matrix);
        }
      }
      else if (ignoreCreeps || roomName !== originRoomName) {
        matrix = getStructureMatrix(room, freshMatrix);
      }
      else {
        matrix = getCreepMatrix(room);
      }
      if (obstacles) {
        matrix = matrix.clone();
        for (let obstacle of obstacles) {
          if (obstacle.pos.roomName !== roomName) {
            continue;
          }
          matrix.set(obstacle.pos.x, obstacle.pos.y, 0xff);
        }
      }
    }
    if (roomCallback) {
      if (!matrix) {
        matrix = new PathFinder.CostMatrix();
      }
      let outcome = roomCallback(roomName, matrix.clone());
      if (outcome !== undefined) {
        return outcome;
      }
    }
    return matrix;
  };
  let ret = PathFinder.search(origin, { pos: destination, range }, {
    maxOps,
    maxRooms,
    plainCost: offRoad ? 1 : ignoreRoads ? 1 : 2,
    swampCost: offRoad ? 1 : ignoreRoads ? 5 : 10,
    roomCallback: callback,
  });
  if (ret.incomplete && ensurePath) {
    if (useFindRoute === undefined) {
      // handle case where pathfinder failed at a short distance due to not using findRoute
      // can happen for situations where the creep would have to take an uncommonly indirect path
      // options.allowedRooms and options.routeCallback can also be used to handle this situation
      if (roomDistance <= 2) {
        console.log(`TRAVELER: path failed without findroute, trying with options.useFindRoute = true`);
        console.log(`from: ${origin}, destination: ${destination}`);
        ret = findTravelPath(origin, destination, {
          movingTarget,
          ignoreCreeps,
          maxOps,
          maxRooms,
          ignoreRoads,
          range,
          route,
          useFindRoute: true,
          allowHostile,
          ignoreStructures,
          freshMatrix,
          obstacles,
          roomCallback,
          offRoad,
          ensurePath,
        });
        console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);
        return ret;
      }
      // TODO: handle case where a wall or some other obstacle is blocking the exit assumed by findRoute
    }
  }
  return ret;
}
/**
* find a viable sequence of rooms that can be used to narrow down pathfinder's search algorithm
* @param origin
* @param destination
* @param options
* @returns {{}}
*/
function findRoute(origin, destination, options = {}) {
  let restrictDistance = options.restrictDistance || Game.map.getRoomLinearDistance(origin, destination) + 10;
  let allowedRooms = { [origin]: true, [destination]: true };
  let highwayBias = 1;
  if (options.preferHighway) {
    highwayBias = 2.5;
    if (options.highwayBias) {
      highwayBias = options.highwayBias;
    }
  }
  let ret = Game.map.findRoute(origin, destination, {
    routeCallback: (roomName) => {
      if (options.routeCallback) {
        let outcome = options.routeCallback(roomName);
        if (outcome !== undefined) {
          return outcome;
        }
      }
      let rangeToRoom = Game.map.getRoomLinearDistance(origin, roomName);
      if (rangeToRoom > restrictDistance) {
        // room is too far out of the way
        return Number.POSITIVE_INFINITY;
      }
      if (!options.allowHostile && Traveler.checkAvoid(roomName) &&
        roomName !== destination && roomName !== origin) {
        // room is marked as "avoid" in room memory
        return Number.POSITIVE_INFINITY;
      }
      let parsed;
      if (options.preferHighway) {
        parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
        let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
        if (isHighway) {
          return 1;
        }
      }
      // SK rooms are avoided when there is no vision in the room, harvested-from SK rooms are allowed
      if (!options.allowSK && !Game.rooms[roomName]) {
        if (!parsed) {
          parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
        }
        let fMod = parsed[1] % 10;
        let sMod = parsed[2] % 10;
        let isSK = !(fMod === 5 && sMod === 5) &&
          ((fMod >= 4) && (fMod <= 6)) &&
          ((sMod >= 4) && (sMod <= 6));
        if (isSK) {
          return 10 * highwayBias;
        }
      }
      return highwayBias;
    },
  });
  if (!_.isArray(ret)) {
    console.log(`couldn't findRoute to ${destination}`);
    return;
  }
  for (let value of ret) {
    allowedRooms[value.room] = true;
  }
  return allowedRooms;
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
  let allowedRooms = this.findRoute(origin, destination);
  if (allowedRooms) {
    return Object.keys(allowedRooms).length;
  }
}
/**
* build a cost matrix based on structures in the room. Will be cached for more than one tick. Requires vision.
* @param room
* @param freshMatrix
* @returns {any}
*/
function getStructureMatrix(room, freshMatrix) {
  if (!structureMatrixCache[room.name] || (freshMatrix && Game.time !== structureMatrixTick)) {
    structureMatrixTick = Game.time;
    let matrix = new PathFinder.CostMatrix();
    structureMatrixCache[room.name] = addStructuresToMatrix(room, matrix, 1);
  }
  return structureMatrixCache[room.name];
}
/**
* build a cost matrix based on creeps and structures in the room. Will be cached for one tick. Requires vision.
* @param room
* @returns {any}
*/
function getCreepMatrix(room) {
  if (!creepMatrixCache[room.name] || Game.time !== creepMatrixTick) {
      creepMatrixTick = Game.time;
      creepMatrixCache[room.name] = addCreepsToMatrix(room, getStructureMatrix(room, true).clone());
  }
  return creepMatrixCache[room.name];
}
/**
* add structures to matrix so that impassible structures can be avoided and roads given a lower cost
* @param room
* @param matrix
* @param roadCost
* @returns {CostMatrix}
*/
function addStructuresToMatrix(room, matrix, roadCost) {
  let impassibleStructures = [];
  for (let structure of room.find(FIND_STRUCTURES)) {
    if (structure instanceof StructureRampart) {
      if (!structure.my && !structure.isPublic) {
        impassibleStructures.push(structure);
      }
    } else if (structure instanceof StructureRoad) {
      matrix.set(structure.pos.x, structure.pos.y, roadCost);
    } else if (structure instanceof StructureContainer) {
      matrix.set(structure.pos.x, structure.pos.y, 5);
    }  else {
      impassibleStructures.push(structure);
    }
  }
  for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
    if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD
      || site.structureType === STRUCTURE_RAMPART) {
      continue;
    }
    matrix.set(site.pos.x, site.pos.y, 0xff);
  }
  for (let structure of impassibleStructures) {
    matrix.set(structure.pos.x, structure.pos.y, 0xff);
  }
  return matrix;
}
/**
* add creeps to matrix so that they will be avoided by other creeps
* @param room
* @param matrix
* @returns {CostMatrix}
*/
function addCreepsToMatrix(room, matrix) {
  room.find(FIND_CREEPS).forEach((creep) => matrix.set(creep.pos.x, creep.pos.y, 0xff));
  return matrix;
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
  if (!travelData.path || travelData.path.length === 0) {
      return ERR_NO_PATH;
  }
  // consume path
  if (state.stuckCount === 0 && !newPath) {
    travelData.path = travelData.path.substr(1);
  }
  let nextDirection = parseInt(travelData.path[0], 10);
  if (returnData) {
    if (nextDirection) {
      let nextPos = positionAtDirection(creep.pos, nextDirection);
      if (nextPos) {
        returnData.nextPos = nextPos;
      }
    }
    returnData.state = state;
    returnData.path = travelData.path;
  }
  movingCreeps[creep.name].nextPosition = positionAtDirection(creep.pos, nextDirection);
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
    if (_.isNumber(creep.memory.target)) {
      target = Game.getObjectById(creep.memory.target)
    } else if (Array.isArray(creep.memory.target)) {
      target = new RoomPosition(...creep.memory.target);
    }
    if (_.isNumber(creep.memory.range)) {
      range = creep.memory.range;
    }
  }
  return [target, range];
}

function moveCreepOutOfTheWay(creep, target, range, creepsToMove, nextPositions, creepMoves) {
  const availableSpots = [...walkBox(creep.pos)].filter(([x, y]) => {
    const newPos = new RoomPosition(x, y, creep.room.name);
    if (target && newPos.getRangeTo(target) > range) {
      return false;
    }
    for (let curr of newPos.look()) {
      if (
        (curr.type === 'terrain' && curr.terrain === 'wall')
        || (
          curr.type === 'structure'
          && !curr.structure instanceof StructureRoad
          && !curr.structure instanceof StructureContainer
          && !(curr.structure instanceof StructureRampart && (curr.my || (!curr.my && curr.isPublic)))
        )
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
        creepsToMove[creepAtMySpot.name] = { target, range }
        moveCreepOutOfTheWay(creepAtMySpot, target, range, creepsToMove, nextPositions, creepMoves);
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
              creepsToMove[creepAtNextPos.name] = { target, range };
            }
          }
        }
      }
    }
  }
  for (let [creepName, { target, range }] of Object.entries(creepsToMove)) {
    const creep = Game.creeps[creepName];
    moveCreepOutOfTheWay(creep, target, range, creepsToMove, nextPositions, creepMoves);
  }

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

const oldMoveTo = Creep.prototype.moveTo;
Creep.prototype.moveTo = function moveTo(target, opts) {
  const result = oldMoveTo.call(this, target, opts);
  const pathString = _.get(this, 'memory._move.path');
  if (pathString) {
    const path = Room.deserializePath(pathString);
    if (path.length) {
      if (lastTick !== Game.time) {
        lastTick = Game.time;
        movingCreeps = {};
      }
      movingCreeps[creep.name] = {
        target,
        nextPosition: path[0],
      };
    }
  }
  return result;
}
