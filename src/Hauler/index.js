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
  scout as roomScout,
  exits as roomExits,
} from '../utils/room';
import {
  isColor,
  scoutFlag as scoutFlagColor,
} from '../utils/colors';
import findPath from '../utils/findPath';
import { renewSelf, vanish, wakeup } from '../Tasks/index';

const root = state => state.Creeps.Scout;
const mapRoot = state => state.Map;
const unexploredRooms = createSelector(
  root,

)

function* newRoomBehavior(creep) {
}

const HAULER_COUNT = 1
const earlyCreeps = _.range(0, HAULER_COUNT).map(num => ({
  name: `Hauler-${num}`,
  body: ({
    appraiser,
    available,
    max,
  }) => {
    // console.log("available: " + available + ", max: " + max);
    const body = [MOVE, CARRY];
    const maxSize = 14;
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
    num,
  },
  priority: 0,
  controller: 'Hauler',
  room: Game.spawns['Spawn1'].room.name,
}));

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

createBrood({
  role: 'Hauler',
  * directCreeps({
    selectors,
  }) {
      yield put(spawnActions.need({
        needs: earlyCreeps,
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
        if (!creep.memory.task) {
          creep.memory.task = "fill";
        }
        if (creep.carry[RESOURCE_ENERGY] === creep.carryCapacity && creep.memory.task === "fill") {
          creep.say("got it", true);
          creep.memory.task = "empty";
        }
        if (creep.carry[RESOURCE_ENERGY] === 0 && creep.memory.task === "empty") {
          if (creep.ticksToLive < 200 && creep.memory.num < HAULER_COUNT ) {
            creep.say("help me!", true);
            creep.memory.task = "renew";
          } else {
            creep.say("need more", true);
            creep.memory.task = "fill";
          }
        }

        if (creep.memory.task === "renew") {
          renewSelf(creep);
        }
        else if (creep.memory.task === "empty") {
          /* new RoomVisual(creep.room.name).circle(creep.pos, {
            radius: .15, fill: "transparent", stroke: "green", strokeWidth: .15, opacity: 1
          }); */
          let targets = creep.room.find(FIND_STRUCTURES, {
            filter(structure){
              return (structure.structureType === STRUCTURE_TOWER || structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN) && structure.energy < structure.energyCapacity;
            }
          })
          if (targets.length === 0) {
            const targetIds = creep.room.memory.containers;
            targets = creep.room.find(FIND_STRUCTURES, {
              filter(structure) {
                return structure.structureType === STRUCTURE_CONTAINER && _.sum(structure.store) < structure.storeCapacity && !targetIds.includes(structure.id)
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
          const target = creep.pos.findClosestByRange(targets);
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
        else if (creep.memory.task === "fill"){

          const targetIds = creep.room.memory.containers;
          const targets = targetIds.map(id => Game.getObjectById(id));
          let validTargets = [];
          for (let target of targets) {
            //if (_.sum(target.store) > creep.carryCapacity + 100) {
            if (_.sum(target.store) > 300) {
              validTargets.push(target);
            }
          }
          let target = creep.pos.findClosestByRange(validTargets);
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
            target = vanish(creep);
          } else {
            wakeup(creep);
          }
          const range = creep.pos.getRangeTo(target);

          if (target && range > 1) {
            creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else if (target && !(target instanceof StructureExtension)) {
            if (target instanceof Resource) {
              creep.pickup(target, RESOURCE_ENERGY);
            } else if (target instanceof Tombstone || target instanceof StructureContainer) {
              creep.withdraw(target, RESOURCE_ENERGY);
            }
            creep.say("got it", true);
            if (target instanceof StructureContainer) {
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
