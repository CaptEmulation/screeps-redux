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
} from '../utils/colors';
import findPath from '../utils/findPath';
import { renewSelf } from '../Tasks/index';

const root = state => state.Creeps.Scout;
const mapRoot = state => state.Map;
const unexploredRooms = createSelector(
  root,
)

const selectHarvesters = createSelector(
  () => Game.creeps,
  creeps => Object.values(creeps).filter(creep => creep.memory && creep.memory.role === 'Harvester'),
)

function* newRoomBehavior(creep) {
}

function getBody({
    appraiser,
    available,
    max,
  })
  {
    //console.log('available =>', available, 'max => ', max);
    const body = [MOVE, CARRY, WORK];
    while (appraiser(body) < available) {
      //console.log('available =>', available, 'max => ', max, 'body =>', body);
      const workCount = body.filter(b => b === WORK).length;
      //console.log('workCount', workCount);
      if (workCount >= 3) {
        break;
      }
      if (appraiser([...body, WORK]) <= available) {
        body.push(WORK);
      } else {
        //console.log('break')
        break;
      }
    }
    return body;
}

const HARVESTER_COUNT = 4;
const earlyCreeps = _.range(0, HARVESTER_COUNT).map(num => ({
  name: `Harvester-${num}`,
  body: getBody,
  memory: {
    role: 'Harvester',
    task: 'fill',
  },
  priority: -600,
  controller: 'Harvester',
  room: Game.spawns['Spawn1'].room.name,
}));

export function init(store) {
  global.spawnHarvester = function(num, flag=0) {
    if (!num) {
      num = selectHarvesters().length;
    }
    let task;
    if (flag) {
      task = 'move';
    } else {
      task = 'fill';
    }
    store.dispatch({
      type: 'EXE',
      payload: spawnActions.spawn({
        name: 'Harvester-' + num,
        body: getBody,
        memory: {
          role: 'Harvester',
          task,
          flag,
        },
        priority: 10,
        controller: 'Harvester',
        room: Game.spawns['Spawn1'].room.name,
      }),
    });
    return "Harvester-" + num;
  }
}


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
          creep.say("full", true);
          creep.memory.task = "empty";
        }
        if (creep.carry[RESOURCE_ENERGY] === 0 && creep.memory.task === "empty") {
          if (creep.ticksToLive < 200 && !creep.memory.dieoff) {
            creep.say("fix me!", true);
            creep.memory.task = "renew";
          }
          else {
            creep.say("hungry", true);
            creep.memory.task = "fill";
          }
        }

        if (creep.memory.task === "renew") {
          renewSelf(creep);
          if (creep.memory.flag) {
            creep.memory.task === 'move';
          }
        }
        else if (creep.memory.task === 'move') {
          const targets = Object.values(Game.flags).filter(isColor([creep.memory.flag, creep.memory.flag]));
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

          let targets = creep.room.find(FIND_STRUCTURES, {
            filter(structure){
              return structure.structureType === STRUCTURE_CONTAINER && _.sum(structure.store) < structure.storeCapacity;
            }
          })
          if (targets.length === 0) {
            let targets = creep.room.find(FIND_STRUCTURES, {
              filter(structure){
                return (structure.structureType === STRUCTURE_EXTENSION || structure.structureType === STRUCTURE_SPAWN) && structure.energy < structure.energyCapacity;
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
        }
        else if (creep.memory.task === "fill"){
          let target;
          if (!creep.memory.source && !creep.memory.flag) {
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
            creep.say("source " + newSource, true);
          }
          else if (creep.memory.flag) {
            const sources = creep.room.find(FIND_SOURCES);
            target = creep.pos.findClosestByRange(sources);
          }
          else {
            target = Game.getObjectById(creep.memory.source.id);
          }
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            //creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else {
            const err = creep.harvest(target);
            //if (creep.name === 'Harvester-4') {
            //  console.log(target, err);
            //}
            if (err) {
              creep.say(err);
            }
            else {
              const saying = Math.random() * 10;
              if (Math.floor(saying) === 1) {
                creep.say("yummy", true);
              }
              else if (Math.floor(saying) === 2) {
                creep.say("nom nom", true);
              }
            }

          }
        }

    }




    }

  });
