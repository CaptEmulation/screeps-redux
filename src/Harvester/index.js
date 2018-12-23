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

function* newRoomBehavior(creep) {
}

function getBody(size, flag=0) {
  return ({
      appraiser,
      available,
      max,
    }) =>
    {
      //console.log('available =>', available, 'max => ', max);
      const body = [MOVE, CARRY, WORK];
      while (appraiser(body) < available) {
        //console.log('available =>', available, 'max => ', max, 'body =>', body);
        const workCount = body.filter(b => b === WORK).length;
        //console.log('workCount', workCount);
        if (workCount >= (size || 3)) {
          if (flag) {
            body.unshift(MOVE);
          }
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
}

function getMemory(task = 'fill', flag) {
  return ({ body }) => ({
    dieoff : body.filter(b => b === WORK).length < 3,
    role: 'Harvester',
    task,
    flag,
  })
}


const HARVESTER_COUNT = 4;
const earlyCreeps = _.range(0, HARVESTER_COUNT).map(num => ({
  name: `Harvester-${num}`,
  body: getBody(),
  memory: getMemory(),
  priority: -600,
  controller: 'Harvester',
  room: Game.spawns['Spawn1'].room.name,
}));

export function init(store) {
  global.spawnHarvester = function({
    num=0,
    flag=0,
    size
  } = {}) {
    if (!num) {
      num = Object.values(Game.creeps).filter(creep => creep.memory && creep.memory.role === 'Harvester').length;
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
        body: getBody(size, flag),
        memory: getMemory(task, flag),
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
    const mySpawnRooms = Object.values(Game.spawns).map(spawn => spawn.room);
    const needs = [];
    let num = 0;
    for (let room of mySpawnRooms) {
      const sourceCount = room.find(FIND_SOURCES).length * 2;
      for (let i = 0; i < sourceCount; i++) {
        needs.push({
          name: `Harvester-${num}`,
          body: getBody(),
          memory: {
            role: 'Harvester',
            task: 'fill'
          },
          priority: -600,
          controller: 'Harvester',
          room: room.name,
        });
        num++;
      }
    }

    yield put(spawnActions.need({
      needs,
      controller: 'Harvester',
    }));
    const creeps = yield select(selectors.alive);
    let remoteConstructionSites = [];
    for (let creep of creeps) {
      if (creep.memory.flag && !remoteConstructionSites.length) {
        // Check for rooms external to spawn that need a builder
        const mySpawnRooms = Object.values(Game.spawns).map(spawn => spawn.room);
        remoteConstructionSites = Object.values(Game.constructionSites)
          .filter(site => !mySpawnRooms.includes(site.room));
      }

      if (creep.memory.task === 'renew') {
        let task
        if (creep.memory.flag) {
          task = 'move';
        }
        else {
          task = 'fill';
        }
        renewSelf(creep, task);
      }

      if (creep.memory.task === 'move') {
        creep.say('move');
        const targets = Object.values(Game.flags).filter(isColor([creep.memory.flag, creep.memory.flag]));
        if (targets.length) {
          const target = targets[0];
          if (creep.pos.getRangeTo(target) > 3) {
            creep.routeTo(target, {
              range: 3,
            });
          } else {
            creep.memory.task = 'fill';
          }
        }
      }

      if (creep.memory.task === 'build') {
        const flags = creep.room.find(FIND_FLAGS, {
          filter(found){
            return isColor([creep.memory.flag, creep.memory.flag]);
          }
        })
        if (flags && remoteConstructionSites.length && creep.carry[RESOURCE_ENERGY]) {
          let targets = remoteConstructionSites.filter(site => site.room === creep.room);
          if (targets.length) {
            const target = creep.pos.findClosestByRange(targets);
            if (creep.pos.getRangeTo(target) > 3) {
              creep.routeTo(target, {
                range: 3,
              });
            } else {
              creep.build(target);
            }
          }
        } else if (creep.carry[RESOURCE_ENERGY]){
          creep.memory.task = 'empty';
        } else {
          if (creep.ticksToLive < 200) {
            creep.say("fix me!", true);
            creep.memory.task = 'renew';
          } else {
            creep.memory.task = 'fill';
          }
        }

      }

      if (creep.memory.task === 'empty') {
        let targets;
        if (targets && targets.length === 0) {
          targets = creep.room.find(FIND_STRUCTURES, {
            filter(structure){
              return (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) && _.sum(structure.store) < structure.storeCapacity;
            }
          })
        }
        if (targets && targets.length === 0) {
          targets = creep.room.find(FIND_STRUCTURES, {
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
          if (target instanceof StructureContainer && (target.hits / target.hitsMax) < 0.95) {
            creep.repair(target);
          } else {
            const amount = Math.min(creep.carry[RESOURCE_ENERGY], target.energyCapacity - target.energy);
            creep.transfer(target, RESOURCE_ENERGY, amount);
          }
        }
        else {
          creep.drop(RESOURCE_ENERGY);
        }
        if (creep.carry[RESOURCE_ENERGY] === 0) {
          if (creep.ticksToLive < 250) {
            creep.say("fix me!", true);
            creep.memory.task = "renew";
          }
          else  {
            const flags = creep.room.find(FIND_FLAGS, {
              filter(found){
                return isColor([creep.memory.flag, creep.memory.flag]);
              }
            })
            if (creep.memory.flag && !flags)
            {
              creep.memory.task = 'move';
            } else {
              creep.memory.task = 'fill';
            }
          }
        }
      }

      if (creep.memory.task === "fill"){
        let target;
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
          creep.say("source " + newSource, true);
        }
        else {
          target = Game.getObjectById(creep.memory.source.id);
        }

        const range = creep.pos.getRangeTo(target);
        if (target && range > 1) {
          creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
          //creep.routeTo(target, { range:0, ignoreCreeps:false });
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

        //console.log(creep.name, creep.carry[RESOURCE_ENERGY]);
        //console.log(creep.name, creep.carryCapacity);
        //console.log(creep.name, creep.body.filter(b => b.type === WORK).length * 2);
        if (creep.carry[RESOURCE_ENERGY] > (creep.carryCapacity - creep.body.filter(b => b.type === WORK).length * 2)) {
          if (remoteConstructionSites.length && creep.memory.flag) {
            creep.memory.task = 'build';
          } else {
            creep.memory.task = 'empty';
          }
        }
      }
    }
  }
});
