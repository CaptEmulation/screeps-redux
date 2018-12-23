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
import findPath from '../utils/findPath';
import { renewSelf, returnSelf, vanish, wakeup } from '../Tasks/index';
import {
  isColor
} from '../utils/colors';

const root = state => state.Creeps.Claimer;
const mapRoot = state => state.Map;
const unexploredRooms = createSelector(
  root,
)

function* newRoomBehavior(creep) {
}

let CLAIMER_COUNT = 0
const earlyCreeps = _.range(0, CLAIMER_COUNT).map(num => ({
  name: `Claimer-${num}`,
  body: [CLAIM, MOVE, MOVE],
  memory: {
    role: 'Claimer',
    task: 'move',
  },
  priority: 10,
  controller: 'Claim',
}));


export function init(store) {
  global.spawnClaimer = function({
    num=0,
    flag1=1,
    flag2=2
  } = {}) {
    if (!num) {
      num = Object.values(Game.creeps).filter(creep => creep.memory && creep.memory.role === 'Claimer').length;
    }
    store.dispatch({
      type: 'EXE',
      payload: spawnActions.spawn({
        name: 'Claimer-' + num,
        body: [CLAIM, MOVE, MOVE],
        memory: {
          num,
          role: 'Claimer',
          task: 'move',
          flag: 0,
          flag1,
          flag2
        },
        priority: 10,
        controller: 'Claimer',
        room: Game.spawns['Spawn1'].room.name,
      }),
    });
    return "Spawned creep Claimer-" + num;
  }
}

createBrood({
  role: 'Claimer',
  * directCreeps({
    selectors,
  }) {
      yield put(spawnActions.need({
        needs: earlyCreeps,
        controller: 'Claimer',
      }));
      const creeps = yield select(selectors.alive);

      if (Game.time % 1000 === 150) {
        console.log(spawnClaimer({flag1: 2}));
      }
      if (Game.time % 1000 === 750) {
        console.log(spawnClaimer());
      }

      const flags = ["flag1", "flag2"];
      for (let creep of creeps) {

        const flag = flags[creep.memory.flag];
        //console.log("flag", flag);
        //console.log(creep.memory[flag]);

        if (!creep.memory[flag] || creep.memory.task === "return") {
          creep.say("nope");
          // returnSelf(creep);
        }

        if (creep.memory.task === "move") {
          creep.say("move");
          const targets = Object.values(Game.flags).filter(isColor([creep.memory[flag], creep.memory[flag]]));
          //console.log(targets);
          if (targets.length) {
            const target = targets[0];
            const range = creep.pos.getRangeTo(target);
            if (range > 1) {
              //let err = creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
              let err = creep.routeTo(target, { range:0, ignoreCreeps:false });
            } else {
              creep.memory.task = "claim";
            }
          }
        }

        else if (creep.memory.task === "claim") {
          const targets = creep.room.find(FIND_STRUCTURES, {
            filter(structure){
              return structure.structureType === STRUCTURE_CONTROLLER;
            }
          });
          const target = targets[0];  // only one claimer in a room
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else if (target) {
            let err;

            if (!target.my && target.owner && target.owner.username) {
              err = creep.attackController(target);
              creep.say("bam", true);
              console.log(creep.name, "attacked controller in room", creep.room.name, "ticks to downgrade", target.ticksToDowngrade);
              if (!err) {
                creep.memory.flag++;
                creep.memory.task = "move";
              }
            } else if (!target.my && !target.owner) {
              err = creep.reserveController(target);
              creep.say("mine", true);
            } else {
              creep.memory.task = "return";
            }
          }
        }

      } // end for creep of creeps
    }
  }); // end createBrood
