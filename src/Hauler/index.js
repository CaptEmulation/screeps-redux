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
  scout,
} from '../Creeps/builds';
import {
  isColor,
} from '../utils/colors';
import {
  scout as roomScout,
  exits as roomExits,
} from '../utils/room';
import findPath from '../utils/findPath';
import { renewSelf, vanish, wakeup } from '../Tasks/index';

const root = state => state.Creeps.Scout;
const mapRoot = state => state.Map;
const unexploredRooms = createSelector(
  root,
)

function* newRoomBehavior(creep) {
}

function scanForContainers(room) {
    let containersInMemory = [];
    let containers = room.find(FIND_STRUCTURES, {
      filter(structure){
        return structure.structureType === STRUCTURE_CONTAINER;
      }
    })
    let sources = room.find(FIND_SOURCES);
    for (let container of containers) {
      for (let source of sources) {
        const range = container.pos.getRangeTo(source);
        if (range < 3) {
          containersInMemory.push(container.id)
        }
      }
    }
    room.memory.containers = containersInMemory;
}

export function init(store) {
  global.spawnHauler = function({
    num=0,
    flag=0,
    size,
  }) {
    if (!num) {
      num = Object.values(Game.creeps).filter(creep => creep.memory && creep.memory.role === 'Hauler').length;
    }
    console.log(num);
    let task;
    if (flag) {
      task = 'move';
    } else {
      task = 'fill';
    }
    store.dispatch({
      type: 'EXE',
      payload: spawnActions.spawn({
        name: "Hauler-" + num,
        body: ({
          appraiser,
          available,
          max,
        }) => {
          // console.log("available: " + available + ", max: " + max);
          const body = [MOVE, CARRY];
          const maxSize = size || 14;
          while (appraiser(body) < available) {
            if (body.length >= maxSize) {
              break;
            }
            if (appraiser([...body, MOVE, CARRY]) <= available) {
              body.push(MOVE, CARRY);
            } else {
              break;
            }
          }
          return body;
        },
        memory: {
          role: 'Hauler',
          task,
          flag,
          num,
        },
        priority: 0,
        controller: 'Hauler',
        room: Game.spawns['Spawn1'].room.name,
      }),
    });
    return "Hauler-" + num;
  }
}

createBrood({
  role: 'Hauler',
  * directCreeps({
    selectors,
  }) {
    let HAULER_COUNT = 2;

    const mySpawnRooms = Object.values(Game.spawns).map(spawn => spawn.room);
    const needs = [];
    let num = 0;
    for (let room of mySpawnRooms) {
      for (let i = 0; i < HAULER_COUNT; i++) {
        needs.push({
          name: `Hauler-${num}`,
          body: ({
            appraiser,
            available,
            max,
          }) => {
            // console.log("available: " + available + ", max: " + max);
            const body = [MOVE, CARRY];
            const maxSize = 20 ;
            while (appraiser(body) < available) {
              if (body.length >= maxSize) {
                break;
              }
              if (appraiser([...body, MOVE, CARRY]) <= available) {
                body.push(MOVE, CARRY);
              } else {
                break;
              }
            }
            return body;
          },
          memory: {
            role: 'Hauler',
            task: 'fill',
            num,
          },
          priority: 0,
          controller: 'Hauler',
          room: room.name,
        });
        num++;
      }
    }

    yield put(spawnActions.need({
      needs,
      controller: 'Hauler',
    }));
    const creeps = yield select(selectors.alive);

    if (Game.time % 200 === 0 || !Game.spawns['Spawn1'].room.memory.containers) {
      const rooms = _.uniq(creeps.map(creep => creep.room));
      for (let room of rooms) {
        scanForContainers(room);
      }
    }
    for (let creep of creeps) {

      if (creep.ticksToLive < 200 && !creep.memory.dieoff && creep.carry[RESOURCE_ENERGY] < 50 ) {
        creep.say("help me!", true);
        creep.memory.task = "renew";
      }
      else if (creep.carry[RESOURCE_ENERGY] === creep.carryCapacity && creep.memory.task === "fill") {
        creep.memory.task = "empty";
      }
      else if (creep.carry[RESOURCE_ENERGY] === 0 && creep.memory.task === "empty") {
        creep.say("need more", true);
        if (creep.memory.flag) {
          creep.memory.task = 'move';
        } else {
          creep.memory.task = "fill";
        }
      }

      if (creep.memory.task === "renew") {
        let task
        if (creep.memory.flag) {
          task = 'move';
        }
        else {
          task = 'fill';
        }
        renewSelf(creep, task);
      }
      else if (creep.memory.task === 'move') {
        //console.log(creep.memory.flag);
        //console.log(JSON.stringify(Object.values(Game.flags)));
        const targets = Object.values(Game.flags).filter(isColor([creep.memory.flag, creep.memory.flag]));
        //console.log(targets);
        if (targets.length) {
          const target = targets[0];
          const range = creep.pos.getRangeTo(target);
          if (range > 1) {
            let err = creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else {
            creep.memory.task = "fill";
          }
        }
      }
      else if (creep.memory.task === "empty") {
        let target;
        let targets = creep.room.find(FIND_STRUCTURES, {
          filter(structure){
            return (structure.structureType === STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
          }
        });
        if (targets.length === 0) {
          targets = creep.room.find(FIND_STRUCTURES, {
            filter(structure){
              return (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN) && structure.energy < structure.energyCapacity;
            }
          })
        }
        if (targets.length === 0) {
          const targetIds = creep.room.memory.containers;
          targets = creep.room.find(FIND_STRUCTURES, {
            filter(structure) {
              return (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_EXTENSION) && _.sum(structure.store) < structure.storeCapacity && !targetIds.includes(structure.id)
            }
          })
        }
        if (targets.length == 0) {
          targets = creep.room.find(FIND_STRUCTURES, {
            filter(structure) {
              return structure.structureType === STRUCTURE_STORAGE;
            }
          })
        }
        if (targets.length == 0) {
          target = Game.spawns['Spawn1']
        } else {
          target = creep.pos.findClosestByRange(targets);
        }
        const range = creep.pos.getRangeTo(target);
        if (target && range > 1) {
          creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
          //creep.routeTo(target, { range:0, ignoreCreeps:false });
        } else if (target) {
          const amount = Math.min(creep.carry[RESOURCE_ENERGY], target.energyCapacity - target.energy);
          creep.say("bloop", true);
          creep.transfer(target, RESOURCE_ENERGY, amount);
        }
        else {
          creep.drop(RESOURCE_ENERGY);
        }
      }
      else if (creep.memory.task === "fill") {
        let target;
        if (creep.room.find(FIND_STRUCTURES, {
          filter(structure){
            return (structure.structureType === STRUCTURE_TOWER) && structure.energy < structure.energyCapacity;
          }
        }).length > 0) {
          const targets = creep.room.find(FIND_STRUCTURES, {
            filter(structure) {
              return (structure.structureType === STRUCTURE_STORAGE || structure.structureType === STRUCTURE_CONTAINER) && structure.store[RESOURCE_ENERGY] > 0;
            }
          });
          if (targets.length) {
            target = creep.pos.findClosestByRange(targets);
          }
        }
        if (!target) {
          const energySources = creep.room.find(FIND_DROPPED_RESOURCES, {
            filter(resource) {
              return resource.resourceType === RESOURCE_ENERGY;
            }
          });
          const tombstones = creep.room.find(FIND_TOMBSTONES, {
            filter(tombstone) {
              return tombstone.store[RESOURCE_ENERGY] > 0;
            }
          });
          target = creep.pos.findClosestByRange([...energySources, ...tombstones]);
        }
        if (!target) {
          const targetIds = creep.room.memory.containers;
          if (targetIds) {
            const targets = targetIds.map(id => Game.getObjectById(id));
            let validTargets = [];
            for (let target of targets) {
              //if (_.sum(target.store) > creep.carryCapacity + 100) {
              if (target && target.store && _.sum(target.store) > 300) {
                validTargets.push(target);
              }
            }
            target = creep.pos.findClosestByRange(validTargets);
          }
        }
        if (!target) {
          target = vanish(creep);
          creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
        }
        else if (creep.memory.targetId) {
          wakeup(creep);
        }

        //console.log(target);
        const range = creep.pos.getRangeTo(target);

        if (target && range > 1) {
          creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
          //creep.routeTo(target, { range:0, ignoreCreeps:false });
        } else if (target && !(target instanceof StructureExtension)) {
          if (target instanceof Resource) {
            creep.pickup(target, RESOURCE_ENERGY);
          } else if (target instanceof Tombstone || target instanceof StructureContainer || target instanceof StructureStorage) {
            creep.withdraw(target, RESOURCE_ENERGY);
          }
          creep.say("got it", true);
          if (target instanceof StructureContainer || creep.carry[RESOURCE_ENERGY] > Math.min(200, creep.carryCapacity) ) {
            creep.memory.task = "empty";
          }
        } else {
          const saying = Math.random() * 10;
          if (Math.floor(saying) === 1) {
            creep.say("bored", true);
          }
        }
      }
    }
  }
});
