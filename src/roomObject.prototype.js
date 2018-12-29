RoomObject.prototype.getAvailablePositions = function () {
	return _.filter(this.lookForNear(LOOK_TERRAIN, true, 1), x => x.terrain !== 'wall');
};
