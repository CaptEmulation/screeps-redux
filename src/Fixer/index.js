import { call, put, select } from 'redux-saga/effects'
import { createSelector } from 'reselect';
import {
  scout as scoutRoom,
} from '../utils/room';
import { actionCreators as spawnActions } from '../Spawn';
import createBrood from '../Creeps/brood';
import {
  actionCreators as mapActions,
  selectors as mapSelectors,
} from '../Map';
import {
  findEnergyDropOffs,
  dropOffEnergy,
} from '../Economy';
import {
  acquireTask,
  tasks as creepTasks,
  findClosestEnergy,
} from '../utils/creeps';
import findPath from '../utils/findPath';
import {
  walkBox
} from '../utils/scan';
import { renewSelf, vanish, wakeup } from '../Tasks/index';

const UPGRADER_COUNT = 1;

let lastNeeds;


function getRepairList(creep, activeFixers) {
  const stuff = creep.room.find(FIND_STRUCTURES, {
    filter(target) {
      return target.structureType !== STRUCTURE_WALL && (target.hits / target.hitsMax) <= 0.85 && !activeFixers.find(fixer => fixer.memory.fixing.id === target.id);
    },
  });
  return stuff;
}

createBrood({
  role: 'Fixer',
  * directCreeps({
    selectors,
  }) {
    if (!lastNeeds || Game.time & 8 === 0) {
      lastNeeds = _.range(0, UPGRADER_COUNT).map(num => ({
        name: `Fixer-${num}`,
        body: ({
          appraiser,
          available,
          max,
        }) => {
          const body = [MOVE, CARRY];
          while (appraiser(body) < available) {
            const workCount = body.filter(b => WORK).length;
            if (workCount >= 8) {
              break;
            }
            if (workCount  % 5 === 0 && appraiser([...body, MOVE, MOVE, CARRY]) < max) {
              body.push(MOVE, MOVE, CARRY);
            } else if (appraiser([...body, WORK]) <= max) {
              body.push(WORK);
            } else {
              break;
            }
          }
          return body;
        },
      }))
    }
    yield put(spawnActions.need({
      needs: lastNeeds,
      memory: {
        role: 'Fixer',
        fixing: {},
      },
      room: Game.spawns['Spawn1'].room.name,
      controller: 'Fixer',
    }));

    let wallsToRepair;
    let notWallsToRepair;

    const activeFixers = yield select(selectors.alive);
    activeFixers.forEach(creep => {
      const somethingToRepair = getRepairList(creep, activeFixers).length > 0;
      if (!somethingToRepair){
        //console.log("nothing to fix");
        if (!creep.memory.task) {
          creep.memory.task = "fill";
        }
        if (creep.ticksToLive < 200) {
          creep.memory.task = "renew";
          creep.say("fix me!", true);
        }
        else if (creep.carry[RESOURCE_ENERGY] === creep.carryCapacity && creep.memory.task === "fill") {
          creep.say("fixer", true);
          creep.memory.task = "empty";
        }
        else if (creep.carry[RESOURCE_ENERGY] === 0 && creep.memory.task === "empty") {
            creep.say("fixer", true);
            creep.memory.task = "fill";
        }

        if (creep.memory.task === "empty") {
          let targets = creep.room.find(FIND_STRUCTURES, {
            filter(structure){
              return (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN) && structure.energy < structure.energyCapacity;
            }
          })
          if (targets.length === 0) {
            targets = creep.room.find(FIND_STRUCTURES, {
              filter(structure){
                return structure.structureType === STRUCTURE_CONTAINER && _.sum(structure.store) < structure.storeCapacity;
              }
            })
          }
          const target = creep.pos.findClosestByRange(targets);
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else if (target) {
            const amount = Math.min(creep.carry[RESOURCE_ENERGY], target.energyCapacity - target.energy);
            creep.transfer(target, RESOURCE_ENERGY, amount);
          }
        } else if (creep.memory.task === "fill"){
          const energySources = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter(resource) {
              return resource.resourceType === RESOURCE_ENERGY;
            }
          });
          //console.log(JSON.stringify(energySources));
          const tombstones = creep.room.find(FIND_TOMBSTONES, {
            filter(tombstone) {
              return tombstone.store[RESOURCE_ENERGY] > 0;
            }
          });

          let target = creep.pos.findClosestByRange([...energySources, ...tombstones]);
          if (!target) {
            target = vanish(creep);
          } else {
            wakeup(creep);
          }
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else {
            if (target instanceof Resource) {
              creep.pickup(target, RESOURCE_ENERGY);
            } else if (target instanceof Tombstone) {
              creep.withdraw(target, RESOURCE_ENERGY);
            }
          }
        }
      }
      if (creep.memory.task === "renew") {
        renewSelf(creep, 1400);
        return;
      }

      if (!creep.memory.fixing || creep.memory.fixing.id && creep.carry.energy === 0) {
        creep.memory.fixing = {};
        creep.say('need fuel', true);
      }
      if (creep.memory.fixing.id && creep.room.energyAvailable < 25 && dropOffEnergy(creep)) {
        // all done
        return;
      }
      if(!creep.memory.fixing.id && creep.carry.energy > 25) {
        if (!wallsToRepair && !notWallsToRepair) {
          const stuff = creep.room.find(FIND_STRUCTURES, {
            filter(target) {
              return (target.hits / target.hitsMax) <= 0.85 && !activeFixers.find(fixer => fixer.memory.fixing.id === target.id);
            },
          });
          // Prioritize not walls
          const walls = [];
          const notWalls = stuff.filter(target => {
            const result = target.structureType !== STRUCTURE_WALL
              && target.structureType !== STRUCTURE_RAMPART;
            if (!result) {
              walls.push(target);
            }
            return result;
          });
          if (notWalls.length) {
            notWallsToRepair = notWalls;
          }
          if (walls.length) {
            wallsToRepair = walls;
          }
        }
        if (notWallsToRepair && notWallsToRepair.length) {
          const mine = creep.pos.findClosestByRange(notWallsToRepair);
          _.remove(notWallsToRepair, mine);
          creep.memory.fixing.id = mine.id;
          creep.memory.fixing.pos = [mine.pos.x, mine.pos.y, mine.pos.roomName];
          creep.say('fixing', true);
        } else if (wallsToRepair && wallsToRepair.length) {
          // find weakest wall
          const mine = _.head(wallsToRepair.sort((a, b) => a.hits - b.hits));
          _.remove(wallsToRepair, mine);
          creep.memory.fixing.id = mine.id;
          creep.memory.fixing.pos = [mine.pos.x, mine.pos.y, mine.pos.roomName];
          creep.say('fixing', true);
        }
      }
      if (creep.memory.fixing.id) {
        if (!creep.memory.fixing.pos[0]) {
          creep.memory.fixing = {};
          return;
        }
        const target = Game.getObjectById(creep.memory.fixing.id);
        if (target.hits === target.hitsMax) {
          creep.memory.fixing = {};
        } else if (creep.pos.getRangeTo(new RoomPosition(...creep.memory.fixing.pos)) > 3) {
          creep.routeTo(target, {
            range: 3,
          });
        } else {
          creep.repair(target);
          creep.getOutOfTheWay(target, 3);
        }
      } else if (somethingToRepair) {
        findClosestEnergy(creep, false);
      }
    });
  },
});
