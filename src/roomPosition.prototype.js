import {
	walkBox,
} from './utils/scan';

Object.defineProperty(RoomPosition.prototype, 'neighbors', {
    get: function () {
			const roomName = _.get(this, 'room.name');
			return [...walkBox(this.pos)]
				.map(([x, y]) => new RoomPosition(x, y, roomName));
    }
});

RoomPosition.prototype.isPassible = function (ignoreCreeps = false) {
    // Is terrain passable?
    if (this.lookFor(LOOK_TERRAIN).find(terrain => terrain === 'wall')) {
      return false;
    }
    // Are there creeps?
    if (ignoreCreeps == false && this.lookFor(LOOK_CREEPS).length > 0)
        return false;
    // Are there structures?
    let impassibleStructures = _.filter(this.lookFor(LOOK_STRUCTURES), function (s) {
        return s.structureType != STRUCTURE_ROAD &&
               s.structureType != STRUCTURE_CONTAINER &&
               !(s.structureType == STRUCTURE_RAMPART && (s.my ||
                                                          s.isPublic));
    });
    return impassibleStructures.length == 0;
};

RoomPosition.prototype.availableNeighbors = function (ignoreCreeps = false) {
    return _.filter(this.neighbors, pos => pos.isPassible(ignoreCreeps));
};
