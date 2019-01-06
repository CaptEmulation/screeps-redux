const DEFAULT_MAXOPS = 20000;

const structureMatrixCache = {};
const creepMatrixCache = {};
let structureMatrixTick;
let creepMatrixTick;


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

function checkAvoid(roomName) {
  return Memory.rooms && Memory.rooms[roomName] && Memory.rooms[roomName].avoid;
}

export function normalizePos(destination) {
  if (!(destination instanceof RoomPosition)) {
    return destination.pos;
  }
  return destination;
}


export function findTravelPath(origin, destination, {
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
export function findRoute(origin, destination, options = {}) {
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
      if (!options.allowHostile && checkAvoid(roomName) &&
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
