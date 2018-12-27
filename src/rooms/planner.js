
import {allBunkerCoords, bunkerCoordLookup, bunkerLayout} from './layout';
import {distanceTransform} from '../utils/distanceTransform';
import {
  findTravelPath,
} from '../utils/path';
import {
  buildPriorities,
} from '../utils/priorities';
import {
  target as targetMatchers,
} from '../utils/matchers';

function coordName(coord) {
	return coord.x + ':' + coord.y;
}

function minBy(objects, iteratee) {
	let minObj = undefined;
	let minVal = Infinity;
	let val;
	for (let i in objects) {
		val = iteratee(objects[i]);
		if (val !== false && val < minVal) {
			minVal = val;
			minObj = objects[i];
		}
	}
	return minObj;
}

const MAX_SAMPLE = 20;
const MAX_TOTAL_PATH_LENGTH = 25 * 4;

function drawBunker(anchor, rcl, opts = {}) {
  const layout = bunkerLayout;
	_.defaults(opts, { opacity: 0.5 });
  let vis = new RoomVisual(anchor.roomName);
	for (let structureType in layout[rcl] && layout[rcl].buildings) {
		for (let pos of layout[rcl] && layout[rcl].buildings[structureType].pos) {
			let dx = pos.x - layout.data.anchor.x;
			let dy = pos.y - layout.data.anchor.y;
			vis.structure(anchor.x + dx, anchor.y + dy, structureType, opts);
		}
	}
}
global.drawBunker = drawBunker;

export function getBunkerLocation(room, visualize) {
  let colony = room && room.memory;
  if (colony && colony.bunker && colony.bunker.anchor) {
    return colony.bunker.anchor;
  }
  let allowableLocations = getAllowableBunkerLocations(room, visualize);
  if (allowableLocations.length > MAX_SAMPLE) {
    allowableLocations = _.sample(allowableLocations, MAX_SAMPLE);
  }
  let minimizePathLengthTo = _.map(_.compact([...room.sources, room.controller]),
                           obj => obj && obj.pos);
  let totalPathLength = function (anchor) {
    let totalDistance = 0;
    for (let pos of minimizePathLengthTo) {
      let ret = findTravelPath(anchor, pos, {ignoreStructures: true});
      if (!ret.incomplete) {
        totalDistance += ret.path.length;
      } else {
        totalDistance += Infinity;
      }
    }
    return totalDistance;
  };
  let bestAnchor = minBy(allowableLocations, pos => totalPathLength(pos));
  return bestAnchor;
}

global.getBunkerLocation = getBunkerLocation;

/*
 * Example usage from console
 * getSpawnLocation({ name: 'W32N45', sources: [{ pos: {x: 11, y: 45, roomName: 'W32N45' }}, { pos: { x: 17, y: 29, roomName: 'W32N45' }}], mineral: [{ pos: { x: 24, y: 44, roomName: 'W32N45' }}]})
 */
function getSpawnLocation(room, visualize = true) {
  const anchor = getBunkerLocation(room, visualize);
  if (anchor) {
    const spawnPos = bunkerLayout[1].buildings.spawn.pos[0];
    let dx = spawnPos.x - bunkerLayout.data.anchor.x;
    let dy = spawnPos.y - bunkerLayout.data.anchor.y;
    return new RoomPosition(anchor.x + dx, anchor.y + dy, room.name);
  }
}

global.getSpawnLocation = getSpawnLocation;

function getAllowableBunkerLocations(room, visualize) {
  let allowableLocations = getNonIntersectingBunkerLocations(room.name, visualize);
  if (allowableLocations.length > MAX_SAMPLE) {
    allowableLocations = _.sample(allowableLocations, MAX_SAMPLE);
  }
  // Filter intersection with controller
  if (!room.controller) return [];
  allowableLocations = _.filter(allowableLocations,
                  anchor => !bunkerIntersectsWith(anchor, _.get(room, 'controller.pos'), 3));
  // Filter intersection with miningSites
  let sitesAndMineral = _.map(_.compact([...room.sources, room.mineral]), obj => obj && obj.pos);
  allowableLocations = _.filter(allowableLocations,
                  anchor => !_.any(sitesAndMineral,
                           pos => bunkerIntersectsWith(anchor, pos, 1)));
  if (visualize) {
    let vis = new RoomVisual();
    for (let pos of allowableLocations) {
      vis.circle(pos.x, pos.y, {fill: 'purple'});
    }
  }
  return allowableLocations;
}

function getNonIntersectingBunkerLocations(roomName, visualize = true) {
  let dt = distanceTransform(roomName);
  let coords = [];
  let x, y, value;
  for (y of _.range(8, 50 - 8)) {
    for (x of _.range(8, 50 - 8)) {
      if (dt.get(x, y) >= 7) {
        coords.push({x, y});
      } else if (dt.get(x, y) >= 5 && !terrainIntersectsWithBunker({x, y}, dt)) {
        coords.push({x, y});
      }
    }
  }
  if (visualize) {
    let vis = new RoomVisual(roomName);
    for (let coord of coords) {
      vis.text(dt.get(coord.x, coord.y).toString(), coord.x, coord.y);
    }
  }
  return _.map(coords, coord => new RoomPosition(coord.x, coord.y, roomName));
}

function terrainIntersectsWithBunker(anchor, distanceMatrix) {
  let dx = anchor.x - bunkerLayout.data.anchor.x;
  let dy = anchor.y - bunkerLayout.data.anchor.y;
  let bunkerCoordsAtAnchor = _.map(allBunkerCoords[8], function (coord) {
    return {x: coord.x + dx, y: coord.y + dy};
  });
  return _.any(bunkerCoordsAtAnchor, coord => distanceMatrix.get(coord.x, coord.y) == 0);
}

function bunkerIntersectsWith(anchor, obstacle, padding = 1) {
  let dx = bunkerLayout.data.anchor.x - anchor.x;
  let dy = bunkerLayout.data.anchor.y - anchor.y;
  let x, y;
  for (x of _.range(obstacle.x + dx - padding, obstacle.x + dx + padding + 1)) {
    for (y of _.range(obstacle.y + dy - padding, obstacle.y + dy + padding + 1)) {
      if (bunkerCoordLookup[8][coordName({x, y})]) {
        return true;
      }
    }
  }
  return false;
}

function getStructureMapForBunkerAt(anchor, room, level = 8) {
	let dx = anchor.x - bunkerLayout.data.anchor.x;
	let dy = anchor.y - bunkerLayout.data.anchor.y;
	let structureLayout = _.mapValues(bunkerLayout[level] && bunkerLayout[level].buildings, obj => obj.pos);
	return _.mapValues(structureLayout, coordArr =>
		_.map(coordArr, coord => new RoomPosition(coord.x + dx, coord.y + dy, room.name)));
}

function canBuild(structureType, pos) {
	if (!pos.roomName) return false;
	let buildings = _.filter(pos.lookFor(LOOK_STRUCTURES), s => s && s.structureType == structureType);
	let sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
	if (!buildings || buildings.length == 0) {
		if (!sites || sites.length == 0) {
			return true;
		}
	}
	return false;
}

export function placeConstructionSites(room, anchor, level) {
  const map = getStructureMapForBunkerAt(anchor, room, level);
  for (let structureType of buildPriorities) {
    if (map[structureType]) {
      for (let pos of map[structureType]) {
        const buildable = canBuild(structureType, pos);
        if (buildable) {
          let result = pos.createConstructionSite(structureType);
          if (result != OK) {
						console.log(`${room.name}: couldn't create construction site of type ` +
									`"${structureType}" at ${pos}. Result: ${result}`);
					}
        }
      }
    }
  }
}

export function placeUpgradeContainer(room, anchor) {
  if (!room.memory.upgradeContainer && room.controller) {
    console.log('Placing upgrade container');
    let target;
    const path = PathFinder.search(anchor, room.controller, {
      range: 3,
    });
    if (!path.incomplete) {
      console.log('found path');
      target = _.tail(path.path);
    }
    if (target) {
      const err = target.createConstructionSite(STRUCTURE_CONTAINER);
      if (!err) {
        console.log('Created construction site');
        room.memory.upgradeContainer = {
          pos: [target.x, target.y],
        };
      }
    }
  } else if (room.memory.upgradeContainer && !room.memory.upgradeContainer.id) {
    const structures = new RoomPosition(...room.memory.upgradeContainer.pos, room.name).lookFor(LOOK_STRUCTURES);
    const container = structures.find(targetMatchers.isContainer);
    if (container) {
      console.log('Resolving id');
      room.memory.upgradeContainer.id = container.id;
    }
  }
}

export function placeSourceContainers(room, anchor) {
  if (!room.memory.sourceContainers) {
    console.log('Placing source containers');
    for (let { id: sourceId } of room.memory.sources) {
      let target;
      const path = PathFinder.search(anchor, Game.getObjectById(sourceId), {
        range: 1,
      });
      if (!path.incomplete) {
        console.log('found path');
        target = _.tail(path.path);
      }
      if (target) {
        const err = target.createConstructionSite(STRUCTURE_CONTAINER);
        if (!err) {
          console.log('Created construction site');
          room.memory.sourceContainers = room.memory.sourceContainers || [];
          room.memory.sourceContainers.push({
            pos: [target.x, target.y],
          });
        }
      }
    }
  } else if (room.memory.sourceContainers.length && room.memory.sourceContainers.find(a => !a.id)) {
    for (let i = 0; i < room.memory.sourceContainers.length; i++) {
      const { pos } = room.memory.sourceContainers[i];
      const structures = new RoomPosition(...pos, room.name).lookFor(LOOK_STRUCTURES);
      const container = structures.find(targetMatchers.isContainer);
      if (container) {
        console.log('Resolving id');
        room.memory.sourceContainers[i].id = container.id;
      }
    }
  }
}
