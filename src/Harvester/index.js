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

const root = state => state.Creeps.Scout;
const mapRoot = state => state.Map;
const unexploredRooms = createSelector(
  root,

)

function* newRoomBehavior(creep) {
}

const HARVESTER_COUNT = 4
const earlyCreeps = _.range(0, HARVESTER_COUNT).map(num => ({
  name: `Harvester-${num}`,
  body: ({
    appraiser,
    available,
    max,
  }) => {
    const body = [MOVE, CARRY, WORK];
    while (appraiser(body) < available) {
      const workCount = body.filter(b => WORK).length;
      if (workCount >= 8) {
        break;
      }
      if (appraiser([...body, MOVE, MOVE, WORK, CARRY]) <= max) {
        body.push(MOVE, MOVE, WORK, CARRY);
      } else {
        break;
      }
    }
    return body;
  },
  memory: {
    role: 'Harvester',
  },
  priority: -600,
  controller: 'Harvester',
  room: Game.spawns['Spawn1'].room.name,
}));

createBrood({
  role: 'Harvester',
  * directCreeps({
    selectors,
  }) {
      yield put(spawnActions.need({
        needs: earlyCreeps,
        controller: 'Harvester',
      }));
      const creeps = yield select(selectors.alive);
      for (let creep of creeps) {
        if (!creep.memory.task) {
          creep.memory.task = "fill";
        }
        if (creep.carry[RESOURCE_ENERGY] === creep.carryCapacity && creep.memory.task === "fill") {
          creep.say("full");
          creep.memory.task = "empty";
        }
        if (creep.carry[RESOURCE_ENERGY] === 0 && creep.memory.task === "empty") {
          creep.say("empty");
          creep.memory.task = "fill";
          delete creep.memory.source;
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
          else {
            creep.drop(RESOURCE_ENERGY);
          }
        } else if (creep.memory.task === "fill"){
          if (!creep.memory.source) {
            if (_.isUndefined(creep.room.memory.lastSource))
            {
              creep.room.memory.lastSource = -1;
            }
            let newSource = creep.room.memory.lastSource + 1;
            const sources = creep.room.find(FIND_SOURCES);
            //creep.say(sources.length);
            if (newSource >= sources.length) {
               newSource = 0;
            }
            const target = sources[newSource];
            creep.memory.source = { id: target.id, pos: [target.pos.x, target.pos.y] };
            creep.room.memory.lastSource = newSource;
            creep.say("source " + newSource);
          }
          const target = Game.getObjectById(creep.memory.source.id);
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else {
            creep.harvest(target);
          }
        }

    }




    }

  });
