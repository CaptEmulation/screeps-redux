import './lodash.prototype';
import './roomPosition.prototype';
import './roomObject.prototype';
import './creep.prototype';
import './spawn.prototype';
import './room.prototype';
import './roomVisual.prototype';

// General energy-per-tick (EPT) goal to aim for
global.SOURCE_GOAL_OWNED = SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME;
global.SOURCE_GOAL_NEUTRAL = SOURCE_ENERGY_NEUTRAL_CAPACITY / ENERGY_REGEN_TIME;
global.SOURCE_GOAL_KEEPER = SOURCE_ENERGY_KEEPER_CAPACITY / ENERGY_REGEN_TIME;
// Optimal number of parts per source (but 1 to 3 more can lower cpu at a minor increase in creep cost)
global.SOURCE_HARVEST_PARTS = SOURCE_ENERGY_CAPACITY / HARVEST_POWER / ENERGY_REGEN_TIME;
global.SOURCE_HARVEST_PARTS_NEUTRAL = SOURCE_ENERGY_NEUTRAL_CAPACITY / HARVEST_POWER / ENERGY_REGEN_TIME;
global.SOURCE_HARVEST_PARTS_KEEPER = SOURCE_ENERGY_KEEPER_CAPACITY / HARVEST_POWER / ENERGY_REGEN_TIME;

// From bencbartlett/creep-tasks

// // RoomObject prototypes ===============================================================================================
// Object.defineProperty(RoomObject.prototype, 'ref', {
//     get: function () {
//         return this.id || this.name || '';
//     },
// });
// Object.defineProperty(RoomObject.prototype, 'targetedBy', {
//     get: function () {
//         // Check that target cache has been initialized - you can move this to execute once per tick if you want
//         TargetCache.assert();
//         return _.map(Game.TargetCache.targets[this.ref], name => Game.creeps[name]);
//     },
// });
// // RoomPosition prototypes =============================================================================================
// Object.defineProperty(RoomPosition.prototype, 'isEdge', {
//     get: function () {
//         return this.x == 0 || this.x == 49 || this.y == 0 || this.y == 49;
//     },
// });
