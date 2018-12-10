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

const UPGRADER_COUNT = 1;

let lastNeeds;

createBrood({
  role: 'Fixer',
  * run({
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
      if (!creep.memory.fixing || creep.memory.fixing.id && creep.carry.energy === 0) {
        creep.memory.fixing = {};
        creep.say('🔄 harvest');
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
          creep.say('🚧 fix');
        } else if (wallsToRepair && wallsToRepair.length) {
          // find weakest wall
          const mine = _.head(wallsToRepair.sort((a, b) => a.hits - b.hits));
          _.remove(wallsToRepair, mine);
          creep.memory.fixing.id = mine.id;
          creep.memory.fixing.pos = [mine.pos.x, mine.pos.y, mine.pos.roomName];
          creep.say('🏰 fix');
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
      } else if(creep.carryCapacity === _.sum(creep.carry)) {
        creep.getOutOfTheWay();
      } else {
        findClosestEnergy(creep, false);
      }
    });
  },
});
