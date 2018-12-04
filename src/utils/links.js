// From Screeps Slack (credit to Warinternal)

const LINK_AUTOBALANCE_THRESHOLD = 100; // Amount of energy over in-network average before transferring.

// TODO change to Link module
StructureLink.prototype.run = function () {
	// var {cooldown,energy,pos,room,memory} = this;
	if (this.cooldown > 0 || (this.energy < LINK_AUTOBALANCE_THRESHOLD) || CPU_LIMITER || BUCKET_LIMITER)
		return;
	if (this.isDeferred() || (Game.time & 3))
		return;
	if (this.room.links.length <= 1) {
		this.defer(LINK_ON_ERROR_DEFER);
		return;
	}
	var { avgInNetwork } = this.room;
	var diff = Math.floor(this.energy - avgInNetwork);
	if (diff < LINK_AUTOBALANCE_THRESHOLD)
		return;
	var target = this.pos.findClosestByRange(this.room.links, { filter: t => t && t.energy < avgInNetwork && !t.isReceiving });
	if (!target)
		return;
	var amt = Math.clamp(0, Math.ceil(diff), LINK_CAPACITY - target.energy);
	if (amt <= 0)
		return;
	if (this.transferEnergy(target, amt) === OK) {
		var dist = this.pos.getRangeTo(target.pos);
		var ept = _.round(amt / dist, 3);
		Log.debug(`${this.pos} Moving ${amt} energy ${dist} units for ${ept} ept`, 'Link');
	}
};
