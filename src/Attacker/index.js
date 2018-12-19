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
import { renewSelf, vanish, wakeup } from '../Tasks/index';
import {
  isColor,
  attackFlag,
} from '../utils/colors';

const root = state => state.Creeps.Attacker;
const mapRoot = state => state.Map;
const unexploredRooms = createSelector(
  root,
)

// const selectAttackers = createSelector(
//   () => Game.creeps,
//   creeps => Object.values(Game.creeps).filter(creep => creep.memory && creep.memory.role === 'Attacker'),
// )

function* newRoomBehavior(creep) {
}

let ATTACKER_COUNT = 0
const earlyCreeps = _.range(0, ATTACKER_COUNT).map(num => ({
  name: `Attacker-${num}`,
  body: [CLAIM, CLAIM, MOVE, MOVE],
  memory: {
    role: 'Attacker',
    task: 'move',
  },
  priority: 10,
  controller: 'Attack',
}));


export function init(store) {
  global.spawnAttacker = function(num) {
    if (!num) {
      num = Object.values(Game.creeps).filter(creep => creep.memory && creep.memory.role === 'Attacker').length;
    }
    store.dispatch({
      type: 'EXE',
      payload: spawnActions.spawn({
        name: 'Attacker-' + num,
        body: [CLAIM, CLAIM, MOVE, MOVE],
        memory: {
          role: 'Attacker',
          task: 'move',
        },
        priority: 10,
        controller: 'Attacker',
        room: Game.spawns['Spawn1'].room.name,
      }),
    });
    return "Attacker-" + num;
  }
}

createBrood({
  role: 'Attacker',
  * directCreeps({
    selectors,
  }) {
      yield put(spawnActions.need({
        needs: earlyCreeps,
        controller: 'Attacker',
      }));
      const creeps = yield select(selectors.alive);

      for (let creep of creeps) {

        if (creep.memory.task === "move") {
          const targets = Object.values(Game.flags).filter(isColor(attackFlag));
          //console.log(targets);
          if (targets.length) {
            const target = targets[0];
            const range = creep.pos.getRangeTo(target);
            if (range > 1) {
              let err = creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
              //creep.routeTo(target, { range:0, ignoreCreeps:false });
            } else {
              creep.memory.task = "attack";
            }
          }
        }

        else if (creep.memory.task === "attack") {
          const targets = creep.room.find(FIND_STRUCTURES);
          const target = creep.pos.findClosestByRange(targets);
          const range = creep.pos.getRangeTo(target);
          if (target && range > 1) {
            creep.moveTo(target, {reusePath: 5, visualizePathStyle: {}});
            //creep.routeTo(target, { range:0, ignoreCreeps:false });
          } else if (target) {
            if (target instanceof StructureController) {
              creep.attackController(target);
            } else {
              creep.attack(target);
            }
            const saying = Math.random() * 20;
            if (Math.floor(saying) === 1) {
              creep.say("pow", true);
            }
            if (Math.floor(saying) === 2) {
              creep.say("kablam", true);
            }
          }
        }
    }

    }

  });
